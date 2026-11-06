// Studio report → PDF (from beauty_platform app/api/session-report). Renders /<locale>/report-print/<token>.
import { NextRequest, NextResponse } from "next/server";


export const runtime = 'nodejs';          // IMPORTANT: not 'edge'
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const isDev = process.env.NODE_ENV !== "production";
/** Matches the print page width, so sections are measured at the size they print. */
const VIEWPORT = { width: 1080, height: 1600 };



type Params = { token: string };
export async function GET(req: NextRequest,
    ctx: { params: Promise<Params> }) {
    const url = new URL(req.url);
    
    const { token } = await ctx.params;
    

    
    const locale = /^[a-z]{2}$/.test(url.searchParams.get("locale") ?? "") ? url.searchParams.get("locale") : "en";
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const origin = req.nextUrl.origin; // safe in App Router
    const target = `${origin}/${locale}/report-print/${encodeURIComponent(token)}`;

    let browser;
    try {
        if (isDev) {
            // ✅ DEV: use full Puppeteer (local Chrome)
            const puppeteer = (await import("puppeteer")).default;
            browser = await puppeteer.launch({
                headless: true,
                protocolTimeout: 120000, // 2 minutes
            });
        } else {
            // ✅ PROD: use serverless Chromium
            const chromium = (await import("@sparticuz/chromium")).default;
            const puppeteerCore = (await import("puppeteer-core")).default;
            browser = await puppeteerCore.launch({
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: true,
                defaultViewport: VIEWPORT,
                protocolTimeout: 120000, // 2 minutes
            });
        }

        const page = await browser.newPage();
        await page.setViewport(VIEWPORT);

        // Wait for page to load with all resources
        await page.goto(target, {
            waitUntil: ["load", "domcontentloaded", "networkidle0"],
            timeout: 60_000
        });

        // The print page sizes one PDF page per report section once its images load.
        await page.waitForFunction(() => window.__reportReady === true, { timeout: 45_000 });

        const pdf = await page.pdf({
            printBackground: true,
            preferCSSPageSize: true, // page sizes come from the print page's @page rules
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
        });


        return new NextResponse(Buffer.from(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="beauty-report.pdf"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        // Surface the real error in dev to debug quickly
        console.error("PDF route error:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    } finally {
        if (browser) await browser.close().catch(() => { });
    }
}

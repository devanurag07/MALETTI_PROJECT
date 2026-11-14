// Studio report → PDF (from beauty_platform app/api/session-report). Renders /<locale>/report-print/<token>.
import { NextRequest, NextResponse } from "next/server";
import { BASE_URL } from "@/core/constants/url-constants";
import sharp from "sharp";


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

        // Shrink every remote photo as it loads (try-on results / the customer's photo come full size from the CDN):
        // the PDF looks the same but is a fraction of the size, so storing and downloading it is fast.
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            const src = request.url();
            if (request.resourceType() !== "image" || !/^https?:/.test(src) || src.startsWith(origin)) {
                void request.continue();
                return;
            }
            void (async () => {
                try {
                    const res = await fetch(src, { signal: AbortSignal.timeout(15_000) });
                    if (!res.ok) throw new Error(String(res.status));
                    const small = await sharp(Buffer.from(await res.arrayBuffer()))
                        .rotate()
                        .resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true })
                        .flatten({ background: "#000000" })
                        .jpeg({ quality: 78, mozjpeg: true })
                        .toBuffer();
                    await request.respond({ status: 200, contentType: "image/jpeg", body: small, headers: { "Access-Control-Allow-Origin": "*" } });
                } catch {
                    await request.continue().catch(() => {});
                }
            })();
        });

        const t0 = Date.now();
        // Only the document itself: the print page waits for its own data, fonts and images and then sets
        // window.__reportReady. ("networkidle0" here used to burn most of the serverless time limit before rendering.)
        await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });

        // The print page sizes one PDF page per report section once its images load.
        await page.waitForFunction(() => window.__reportReady === true, { timeout: 45_000, polling: 250 });
        console.log(`[studio-report] ${token}: page ready in ${Date.now() - t0} ms`);

        const t1 = Date.now();
        const pdf = await page.pdf({
            printBackground: true,
            preferCSSPageSize: true, // page sizes come from the print page's @page rules
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
        });


        console.log(`[studio-report] ${token}: PDF ${Math.round(pdf.length / 1024)} KB in ${Date.now() - t1} ms`);

        // ?store=1 (kiosk, in the background): keep the PDF on the share, so the phone downloads it with no wait.
        if (url.searchParams.get("store") === "1") {
            const form = new FormData();
            form.append("file", new Blob([Buffer.from(pdf)], { type: "application/pdf" }), "beauty-report.pdf");
            const res = await fetch(`${BASE_URL.replace(/\/$/, "")}/studio/public/looks/${encodeURIComponent(token)}/pdf/`, {
                method: "POST", body: form, signal: AbortSignal.timeout(90_000), // never hang the kiosk on a slow upload
            });
            const body = await res.json().catch(() => null);
            if (!res.ok) return NextResponse.json({ error: body?.message ?? `Store failed (${res.status})` }, { status: 502 });
            return NextResponse.json({ pdf_url: body?.data?.pdf_url ?? null });
        }

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

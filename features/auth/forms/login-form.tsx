import React, { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LOGIN_URL } from "@/core/constants/url-constants";
import { TOKEN_KEY } from "@/core/constants/common-constants";
import axiosClient from "@/core/network/axios-client";
import { Toast } from "@/design-system/components/toast/toast";
import { Eye, EyeOff } from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [accessCode, setAccessCode] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const handleInputChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newAccessCode = [...accessCode];
      newAccessCode[index] = value;
      setAccessCode(newAccessCode);

      if (value && index < 5) {
        inputRefs[index + 1].current?.focus();
      }
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !accessCode[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const code = accessCode.join("");
    if (code.length !== 6) return;

    setIsLoading(true);
    try {
      const response = await axiosClient.post(LOGIN_URL, {
        code: code,
        password: password,
      });
      const data = response.data;
      console.log(data.data.access_token);
      console.log("data ", data);
      if (response.status) {
        localStorage.setItem(TOKEN_KEY, data.data.access_token);
        onLogin();
      } else {
        Toast.error("Invalid access code");
      }
    } catch (error) {
      console.error("Login error:", error);
      Toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="text-bv-ink flex items-center justify-center h-full w-full">
      <Card className="bg-bv-surface border-bv-line p-8 w-full max-w-[800px]">
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <h2 className="text-2xl md:text-5xl font-semibold text-center mb-6 text-bv-ink">
              Access Code
            </h2>
            <div className="flex justify-center space-x-2 sm:space-x-4">
              {accessCode.map((digit, index) => (
                <Input
                  key={index}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  ref={inputRefs[index]}
                  className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-2xl sm:text-3xl md:text-4xl text-center bg-bv-surface-raised border-bv-line-strong text-bv-ink"
                />
              ))}
            </div>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-28 !text-7xl md:!text-7xl leading-none px-5 py-2 pr-20 tracking-wider text-bv-ink placeholder:text-4xl"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-6 top-1/2 -translate-y-1/2 rounded-lg p-3 text-bv-ink hover:text-bv-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-bv-accent"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-12 w-12" strokeWidth={2} />
                ) : (
                  <Eye className="h-12 w-12" strokeWidth={2} />
                )}
              </button>
            </div>
            <button
              type="submit"
              className="w-full py-4 px-6 text-4xl font-semibold bg-bv-accent hover:opacity-90 text-bv-on-accent rounded-full shadow-bv-glow transition-opacity duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-bv-ink focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || accessCode.join("").length !== 6}
            >
              {isLoading ? (
                <>
                  <svg
                    className="inline-block mr-2 h-6 w-6 animate-spin"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Logging in...
                </>
              ) : (
                "LOGIN"
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

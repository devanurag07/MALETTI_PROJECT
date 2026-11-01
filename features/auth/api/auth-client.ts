import axiosClient from "@/core/network/axios-client";
import { UnauthorizedException } from "@/core/exceptions/unauthorized-exception";

export const loginMirror = async (code: string, password: string) => {
    const response = await axiosClient.post("/auth/login", { code, password });
    if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
    } else {
        throw new UnauthorizedException(response.data.message);
    }
};


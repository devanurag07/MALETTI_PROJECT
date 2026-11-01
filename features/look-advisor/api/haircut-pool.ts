import axiosClient from "@/core/network/axios-client";
import { HAIRCUT_POOL_URL } from "@/core/constants/url-constants";

export interface HaircutPoolItem {
    name: string;
    prompt: string;
}

export const getHaircutPool = async (gender: string): Promise<HaircutPoolItem[]> => {
    const response = await axiosClient.get(HAIRCUT_POOL_URL, { params: { gender } });
    return response.data?.data ?? [];
}

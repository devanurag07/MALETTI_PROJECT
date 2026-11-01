import axiosClient from "@/core/network/axios-client";
import { RECOMMEND_HAIRCOLOR_URL } from "@/core/constants/url-constants";
import { getFileFromLocalStorage } from "@/core/utils/common";
import { CAMERA_CAPTURE_KEY } from "@/core/constants/common-constants";

/**
 * API function to get haircolor recommendations
 * @param gender - User's gender
 * @param ageGroup - User's age group
 * @param colorFamily - Preferred color family
 * @returns Promise with haircolor recommendations
 */
export const recommendHaircolor = async (gender: string,colorFamily:string, ageGroup?: string) => {
    const formData = new FormData()
    const image = getFileFromLocalStorage(CAMERA_CAPTURE_KEY)

    formData.append("gender", gender ?? "female")
    if(ageGroup)
        formData.append("age_group", ageGroup)
    formData.append("hair_color", colorFamily)
    formData.append("image", image as Blob)

    const response = await axiosClient.post(RECOMMEND_HAIRCOLOR_URL, formData);
    return response.data;
}
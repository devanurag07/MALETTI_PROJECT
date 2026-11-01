import axiosClient from "@/core/network/axios-client";
import { RECOMMEND_HAIRSTYLE_URL } from "@/core/constants/url-constants";
import { getFileFromLocalStorage } from "@/core/utils/common";
import { CAMERA_CAPTURE_KEY } from "@/core/constants/common-constants";

export const recommendHairstyle = async (gender: string, hair_length: string,age_group?: string) => {

    const formData = new FormData()
    let image = getFileFromLocalStorage(CAMERA_CAPTURE_KEY)
    formData.append("gender", gender ?? "female")
    if(age_group)
        formData.append("age_group", age_group)
    formData.append("hair_length", hair_length)
    formData.append("image", image as Blob)

    const response = await axiosClient.post(RECOMMEND_HAIRSTYLE_URL, formData);
    return response.data;
}
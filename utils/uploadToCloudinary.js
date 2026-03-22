import cloudinary from "../config/cloudinary.js"

export const uploadToCloudinary = async (fileBuffer , folderName) => {
    return new Promise((reslove , reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: `ATELIER/${folderName}`,
                format: "webp",
            },
            (error , result) => {
                if(error){
                    console.log("Cloudinary Upload Error" + error)
                    reject(error)
                }else{
                    reslove(result)
                }
            }
        );

        uploadStream.end(fileBuffer);
    })
}

export const deleteFromCloudinary = async (publicId) => {
    try {
        if(!publicId) return;
        const parts = publicId.split("/");
        const publicIdWithExtension = parts.slice(-3).join("/");
        const result = publicIdWithExtension.split(".")[0];

        await cloudinary.uploader.destroy(result);
        console.log("Deleted from Cloudinary:", result);
    } catch (error) {
        console.error("Cloudinary Delete Error" + error)
    }
}
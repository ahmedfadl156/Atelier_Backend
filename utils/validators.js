import z from "zod";

export const createOrderSchema = z.object({
    body: z.object({
        shippingAddress: z.object({
            firstName: z.string().min(2, "First name is too short"),
            lastName: z.string().min(2, "Last name is too short"),
            street: z.string().min(5, "Street address is required"),
            city: z.string().min(2, "City is required"),
            country: z.string().min(2, "Country is required"),
            phoneNumber: z
                .string()
                .trim()
                .regex(/^(?:\+201|01|00201)[0125][0-9]{8}$/, "Phone number must be a valid Egyptian mobile number"),
        })
    })
})

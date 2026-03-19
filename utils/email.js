import { mailtrapClient, sender } from "../config/mailtrap.config.js";
import { PASSWORD_RESET_REQUEST_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE, WELCOME_EMAIL_TEMPLATE } from "./emailTemplates.js";

export const sendVerificationEmail = async (email , verificationToken) => {
    const recipent = [{email}];
    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recipent,
            subject: "Verify Your Email",
            html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}" , verificationToken),
            category: "Emai Verification"
        })
        console.log("Email Sent Successfully" + response)
    } catch (error) {
        console.error("Error While Sent Email" + error)
    }
}

export const sendWelcomeEmail = async (email , userName) => {
    const recipent = [{email}];
    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recipent,
            subject: "Welcome Email",
            html: WELCOME_EMAIL_TEMPLATE.replace("{userName}" , userName),
            category: "Welcome Email"
        })
        console.log("Welcome Email Sent Successfully" + response)
    } catch (error) {
        console.error("Error while send welcome Email" + error)
    }
}

export const sendPasswordResetEmail = async (email , resetUrl) => {
    const recipent = [{email}];
    try {
        const response = await mailtrapClient.send({
            from: sender,
            to: recipent,
            subject: "Reset Your Password",
            html: PASSWORD_RESET_REQUEST_TEMPLATE.replace('{resetURL}' , resetUrl),
            category: "Password Reset"
        })
        console.log("Password Reset Sent Successfully" + response)
    } catch (error) {
        console.error("Error while send Password Reset Email" + error)
    }
}
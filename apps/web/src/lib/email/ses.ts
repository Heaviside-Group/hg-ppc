/**
 * AWS SES Email Service
 */
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { authConfig } from '@/lib/auth/config'

// Initialize SES client
const sesClient = new SESClient({
  region: authConfig.awsRegion,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
})

/**
 * Send authentication code email
 */
export async function sendAuthEmail(
  toEmail: string,
  code: string
): Promise<boolean> {
  // In development without SES credentials, log the code instead
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('='.repeat(50))
      console.log(`[DEV MODE] Auth code for ${toEmail}: ${code}`)
      console.log('='.repeat(50))
      return true
    }
    console.error(
      '[SES] Missing AWS credentials in production. Auth email not sent.'
    )
    return false
  }

  const subject = 'Your Heaviside PPC Login Code'
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #1a1a1a; margin: 0;">Heaviside PPC</h1>
    <p style="color: #666; margin-top: 5px;">Ad Performance Platform</p>
  </div>

  <div style="background: #f9fafb; border-radius: 8px; padding: 30px; text-align: center;">
    <p style="margin: 0 0 20px 0; color: #666;">Your verification code is:</p>
    <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; font-family: monospace;">
      ${code}
    </div>
    <p style="margin: 20px 0 0 0; color: #666; font-size: 14px;">
      This code expires in 10 minutes.
    </p>
  </div>

  <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
    <p>If you didn't request this code, you can safely ignore this email.</p>
    <p>&copy; ${new Date().getFullYear()} Heaviside Group. All rights reserved.</p>
  </div>
</body>
</html>
  `

  const textBody = `
Your Heaviside PPC Login Code

Your verification code is: ${code}

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.
  `.trim()

  try {
    const command = new SendEmailCommand({
      Source: authConfig.sesFromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
          Text: {
            Data: textBody,
            Charset: 'UTF-8',
          },
        },
      },
    })

    const response = await sesClient.send(command)
    if (response.MessageId) {
      console.log(
        `[SES] Auth code email sent to ${toEmail} (messageId=${response.MessageId})`
      )
    } else {
      console.log(`[SES] Auth code email sent to ${toEmail}`)
    }
    return true
  } catch (error) {
    console.error('Error sending email via SES:', error)
    return false
  }
}

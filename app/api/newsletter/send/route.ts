import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resendApiKey = process.env.RESEND_API_KEY
const resendFrom = process.env.RESEND_FROM || process.env.RESEND_FROM_EMAIL || 'SELPIC <info@selpic.com.au>'

const resendClient = resendApiKey ? new Resend(resendApiKey) : null

export async function POST(req: Request) {
  try {
    if (!resendClient) {
      return NextResponse.json(
        { success: false, message: 'Email service is not configured.' },
        { status: 500 }
      )
    }

    const { to, subject, html, attachments } = await req.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: to, subject, html' },
        { status: 400 }
      )
    }

    // 단일 이메일 또는 배열 처리
    const recipients = Array.isArray(to) ? to : [to]

    // Resend API로 이메일 발송
    const emailOptions: any = {
      from: resendFrom,
      reply_to: process.env.RESEND_FROM_EMAIL || 'info@selpic.com.au',
      to: recipients,
      subject: subject,
      html: html
    }

    // 파일 첨부가 있는 경우 처리 (나중에 구현)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      // Resend는 base64 인코딩된 파일을 지원
      emailOptions.attachments = attachments.map((file: any) => ({
        filename: file.filename || 'attachment',
        content: file.content, // base64 인코딩된 내용
        contentType: file.contentType || 'application/octet-stream'
      }))
    }

    const result = await resendClient.emails.send(emailOptions)

    if (result.error) {
      console.error('Resend API error:', result.error)
      return NextResponse.json(
        { success: false, message: result.error.message || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: result.data
    })
  } catch (error: any) {
    console.error('Newsletter send API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Something went wrong while sending email.' },
      { status: 500 }
    )
  }
}


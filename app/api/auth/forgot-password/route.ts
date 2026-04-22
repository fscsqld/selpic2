import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { useUserAuth } from '@/lib/userAuth'
import { appendTransactionalEmailBrandingHtml } from '@/lib/transactionalEmailBranding'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const { users, updateUser } = useUserAuth.getState()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    
    // 보안: 존재하지 않는 이메일이어도 성공 메시지 반환 (이메일 열거 방지)
    if (!user) {
      // 실제 이메일 전송 없이 성공 응답 반환
      return NextResponse.json({ success: true })
    }

    // 토큰 생성 (32바이트 랜덤 hex 문자열)
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1시간 후 만료

    // 사용자 데이터 업데이트
    updateUser(user.id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetTokenExpiry.toISOString()
    })

    // 재설정 링크 생성
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      'https://selpic.com.au'
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    // Resend API 키가 설정되어 있으면 실제 이메일 전송
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey) {
      try {
        const resend = new Resend(resendKey)
        const coreHtml = `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Selpic</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                  <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
                  <p>Hello ${user.name || 'there'},</p>
                  <p>You requested to reset your password for your Selpic account. Click the button below to reset it:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetLink}" 
                       style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      Reset Password
                    </a>
                  </div>
                  <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
                  <p style="color: #4F46E5; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">${resetLink}</p>
                  <p style="color: #ef4444; font-size: 14px; margin-top: 30px;">
                    <strong>Important:</strong> This link will expire in <strong>1 hour</strong>.
                  </p>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                    If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                  </p>
                </div>
                </div>`
        const bodyInner = appendTransactionalEmailBrandingHtml(coreHtml.trim())
        const htmlDoc = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background:#f9fafb;">
    ${bodyInner}
  </body>
</html>`
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Selpic <noreply@selpic.com.au>',
          to: email,
          subject: 'Password Reset Request - Selpic',
          html: htmlDoc
        })
        console.log('✅ Password reset email sent successfully to:', email)
      } catch (emailError) {
        console.error('❌ Failed to send password reset email:', emailError)
        // 이메일 전송 실패해도 토큰은 생성되었으므로 성공 응답 반환
        // (사용자는 토큰이 생성되었지만 이메일을 받지 못했을 수 있음)
      }
    } else {
      console.warn('⚠️ RESEND_API_KEY not set. Email not sent. Token generated:', resetToken)
      // 개발 환경에서는 토큰을 콘솔에 출력 (프로덕션에서는 제거)
      if (process.env.NODE_ENV === 'development') {
        console.log('🔗 Reset link (dev only):', resetLink)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Forgot password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


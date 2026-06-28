import { jwtVerify, type JWTPayload } from 'jose'

const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)

/**
 * Verifies a Supabase-issued JWT using the project's JWT secret.
 * Validates signature, expiry, and algorithm — no network call required.
 * Throws if the token is invalid, expired, or tampered with.
 */
export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload
}

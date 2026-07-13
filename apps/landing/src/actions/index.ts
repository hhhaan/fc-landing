import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { createClient } from '../lib/supabase';
import { buildWebAuthCallbackUrl } from '../lib/siteUrl';

export const server = {
    // 회원가입
    signUp: defineAction({
        accept: 'form',
        input: z.object({
            email: z.string().email(),
            password: z.string().min(6),
        }),
        handler: async (input, context) => {
            try {
                const supabase = createClient({
                    request: context.request,
                    cookies: context.cookies,
                });

                const origin = new URL(context.request.url).origin;
                const { error } = await supabase.auth.signUp({
                    email: input.email,
                    password: input.password,
                    options: {
                        emailRedirectTo: buildWebAuthCallbackUrl('/', origin),
                    },
                });

                if (error) {
                    return {
                        success: false,
                        message: error.message,
                    };
                }

                return {
                    success: true,
                    message: '이메일을 확인해주세요. 계정을 인증해야 로그인할 수 있습니다.',
                };
            } catch (err) {
                return {
                    success: false,
                    message: '알 수 없는 오류가 발생했습니다.',
                };
            }
        },
    }),

    // 로그인
    signIn: defineAction({
        accept: 'form',
        input: z.object({
            email: z.string().email(),
            password: z.string().min(1),
        }),
        handler: async (input, context) => {
            try {
                const supabase = createClient({
                    request: context.request,
                    cookies: context.cookies,
                });

                const { error } = await supabase.auth.signInWithPassword({
                    email: input.email,
                    password: input.password,
                });

                if (error) {
                    return {
                        success: false,
                        message: error.message,
                    };
                }

                return {
                    success: true,
                    message: '로그인 성공',
                };
            } catch (err) {
                return {
                    success: false,
                    message: '알 수 없는 오류가 발생했습니다.',
                };
            }
        },
    }),

    // 로그아웃
    signOut: defineAction({
        handler: async (_, context) => {
            try {
                const supabase = createClient({
                    request: context.request,
                    cookies: context.cookies,
                });

                await supabase.auth.signOut();

                return { success: true };
            } catch (err) {
                return {
                    success: false,
                    message: '로그아웃 실패',
                };
            }
        },
    }),
};

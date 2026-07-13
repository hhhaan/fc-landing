// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	server: { port: 4322 },
	site: 'https://docs.firstcrackiscoming.com',
	integrations: [
		starlight({
			title: 'First Crack Docs',
			description: 'First Crack 사용 가이드 — 설치, 로스팅 머신 연동, 요금제 및 환불',
			defaultLocale: 'root',
			locales: {
				root: {
					label: '한국어',
					lang: 'ko',
				},
			},
			credits: false,
			components: {
				Header: './src/components/Header.astro',
				Footer: './src/components/Footer.astro',
				PageTitle: './src/components/PageTitle.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
				ThemeProvider: './src/components/ThemeProvider.astro',
			},
			customCss: ['./src/styles/custom.css'],
			sidebar: [
				{
					label: '시작하기',
					items: [
						{ label: '사용 가이드', slug: 'index' },
						{ label: '시스템 사양', slug: 'start/system-requirements' },
						{ label: 'macOS 설치', slug: 'start/install-mac' },
						{ label: 'Windows 설치', slug: 'start/install-windows' },
					],
				},
				{
					label: '로스팅 머신 연동',
					items: [
						{ label: '연동 개요', slug: 'machines' },
						{ label: 'Modbus (PLC / 컨트롤러)', slug: 'machines/modbus' },
						{ label: 'Phidget (온도 센서)', slug: 'machines/phidget' },
						{ label: 'Artisan 설정 가져오기', slug: 'machines/artisan' },
						{ label: '시리얼 포트 드라이버', slug: 'machines/serial-driver' },
						{ label: '연동 문제 해결', slug: 'machines/troubleshooting' },
					],
				},
				{
					label: '서비스 · 결제',
					items: [
						{ label: '요금제', slug: 'service/plans' },
						{ label: '구독 · 결제', slug: 'service/billing' },
						{ label: '환불 규칙', slug: 'service/refund' },
						{ label: '이용약관 요약', slug: 'service/terms' },
					],
				},
				{
					label: '지원',
					items: [{ label: '문의하기', slug: 'support/contact' }],
				},
			],
			head: [
				{
					tag: 'link',
					attrs: { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
				},
				{
					tag: 'link',
					attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
				},
				{
					tag: 'link',
					attrs: {
						rel: 'preconnect',
						href: 'https://fonts.gstatic.com',
						crossorigin: true,
					},
				},
				{
					tag: 'link',
					attrs: {
						rel: 'stylesheet',
						href: 'https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500&display=swap',
					},
				},
			],
		}),
	],
});
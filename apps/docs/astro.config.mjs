// @ts-check

import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    server: { port: 4322 },
    site: 'https://docs.firstcrackiscoming.com',
    integrations: [
        starlight({
            title: 'First Crack Docs',
            description: 'First Crack 사용 가이드 — 설치, 로스팅 머신 연동, 쇼핑몰 주문 연동, 요금제 및 환불',
            defaultLocale: 'root',
            locales: {
                root: {
                    label: '한국어',
                    lang: 'ko',
                },
                en: {
                    label: 'English',
                    lang: 'en',
                },
                ja: {
                    label: '日本語',
                    lang: 'ja',
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
                    translations: {
                        en: 'Getting started',
                        ja: 'はじめに',
                    },
                    items: [
                        {
                            label: '사용 가이드',
                            translations: { en: 'User guide', ja: 'ユーザーガイド' },
                            slug: 'index',
                        },
                        {
                            label: '시스템 사양',
                            translations: { en: 'System requirements', ja: 'システム要件' },
                            slug: 'start/system-requirements',
                        },
                        {
                            label: 'macOS 설치',
                            translations: { en: 'Install on macOS', ja: 'macOS インストール' },
                            slug: 'start/install-mac',
                        },
                        {
                            label: 'Windows 설치',
                            translations: { en: 'Install on Windows', ja: 'Windows インストール' },
                            slug: 'start/install-windows',
                        },
                    ],
                },
                {
                    label: '로스팅 머신 연동',
                    translations: {
                        en: 'Roaster connection',
                        ja: '焙煎機の接続',
                    },
                    items: [
                        {
                            label: '연동 개요',
                            translations: { en: 'Overview', ja: '概要' },
                            slug: 'machines',
                        },
                        {
                            label: 'Modbus (PLC / 컨트롤러)',
                            translations: { en: 'Modbus (PLC / controller)', ja: 'Modbus（PLC / コントローラー）' },
                            slug: 'machines/modbus',
                        },
                        {
                            label: 'Phidget (온도 센서)',
                            translations: { en: 'Phidget (temperature)', ja: 'Phidget（温度センサー）' },
                            slug: 'machines/phidget',
                        },
                        {
                            label: 'Artisan 설정 가져오기',
                            translations: { en: 'Import Artisan settings', ja: 'Artisan設定の取り込み' },
                            slug: 'machines/artisan',
                        },
                        {
                            label: '시리얼 포트 드라이버',
                            translations: { en: 'Serial port drivers', ja: 'シリアルポートドライバー' },
                            slug: 'machines/serial-driver',
                        },
                        {
                            label: '연동 문제 해결',
                            translations: { en: 'Troubleshooting', ja: '接続トラブルシューティング' },
                            slug: 'machines/troubleshooting',
                        },
                    ],
                },
                {
                    label: '쇼핑몰 주문 연동',
                    translations: {
                        en: 'Order channels',
                        ja: 'EC注文連携',
                    },
                    items: [
                        {
                            label: '연동 개요',
                            translations: { en: 'Overview', ja: '概要' },
                            slug: 'orders',
                        },
                        {
                            label: '네이버 스마트스토어',
                            translations: { en: 'Naver Smart Store', ja: 'Naver Smart Store' },
                            slug: 'orders/naver',
                        },
                        {
                            label: 'Shopify',
                            slug: 'orders/shopify',
                        },
                        {
                            label: 'Cafe24',
                            slug: 'orders/cafe24',
                        },
                        {
                            label: '상품 SKU 매핑',
                            translations: { en: 'Product SKU mapping', ja: '商品SKUマッピング' },
                            slug: 'orders/sku-mapping',
                        },
                        {
                            label: '문제 해결',
                            translations: { en: 'Troubleshooting', ja: 'トラブルシューティング' },
                            slug: 'orders/troubleshooting',
                        },
                    ],
                },
                {
                    label: '서비스 · 결제',
                    translations: {
                        en: 'Billing & plans',
                        ja: 'サービス・お支払い',
                    },
                    items: [
                        {
                            label: '요금제',
                            translations: { en: 'Plans', ja: '料金プラン' },
                            slug: 'service/plans',
                        },
                        {
                            label: '구독 · 결제',
                            translations: { en: 'Subscription & billing', ja: 'サブスク・お支払い' },
                            slug: 'service/billing',
                        },
                        {
                            label: '환불 규칙',
                            translations: { en: 'Refund policy', ja: '返金ポリシー' },
                            slug: 'service/refund',
                        },
                        {
                            label: '이용약관 요약',
                            translations: { en: 'Terms summary', ja: '利用規約の要約' },
                            slug: 'service/terms',
                        },
                    ],
                },
                {
                    label: '지원',
                    translations: {
                        en: 'Support',
                        ja: 'サポート',
                    },
                    items: [
                        {
                            label: '문의하기',
                            translations: { en: 'Contact', ja: 'お問い合わせ' },
                            slug: 'support/contact',
                        },
                    ],
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

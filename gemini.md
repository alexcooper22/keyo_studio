# Keyo Studio — Agent Instructions

## Project Overview
Keyo Studio (keyo.studio) is an AI creative platform — a competitor to Higgsfield.
Users generate text, images and video using top AI models in one place.
Target audience: creators, marketers, businesses (Ukrainian & CIS market + global).
Current stage: building real Next.js product, starting with Main (Explore) page.

## Tech Stack
- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Fonts: Google Fonts — Syne (headings) + DM Sans (body)
- Language: TypeScript
- No UI libraries (no shadcn, no MUI) — custom components only
- Deployment target: Vercel

## Project Structure
app/
  layout.tsx        — root layout with fonts + metadata
  page.tsx          — Main/Explore page
  globals.css       — global styles + CSS variables
components/
  Navbar.tsx        — top navigation
  HeroSection.tsx   — hero with headline + CTA buttons
  FeatureCards.tsx  — 5 content type cards (Text, Image, Video, Audio, Edit)
  StatsBar.tsx      — bottom stats row
public/             — static assets

## Design System (CSS Variables in globals.css)
--bg: #080808
--bg2: #0f0f0f
--bg3: #161616
--border: rgba(255,255,255,0.06)
--border-hover: rgba(255,255,255,0.15)
--text: #f0f0f0
--muted: #555555
--muted2: #888888
--accent: #ff8000
--accent2: #ff9a2e
--teal: #00ffc8
--purple: #a78bfa
--red: #ff3366

## Typography Rules
- Headings: font-family Syne, font-weight 800, tracking-tight
- Body: font-family DM Sans, font-weight 300-500
- Nav tabs: DM Sans 500, white color opacity-75, active opacity-100
- Always import both fonts via next/font/google

## Navbar Component Rules
- Fixed top, height 54px, z-index 100
- Background: rgba(8,8,8,0.92) with backdrop-blur-xl
- Border bottom: 1px solid var(--border)
- TOP: thin 3px gradient line: transparent → #ff8000 → #ff9a2e → transparent
- Logo: "keyo" in Syne 800 text color #ff8000 + ".ai" smaller faded orange
- Center tabs in order: Explore · Image · Video · Text · Audio · Edit
- All tabs white (#ffffff), opacity-75, hover opacity-100
- Active tab: opacity-100 + 1.5px orange underline (#ff8000)
- "Text" tab has small orange badge "NEW"
- Right side: "Login" ghost button + "Sign up" orange button (#ff8000 bg, black text)

## Hero Section Rules
- Padding top: 88px (accounts for fixed navbar)
- Center aligned
- Small eyebrow pill: "AI Creative Platform" — orange dot pulsing + orange border
- H1: "Create anything with AI." — Syne 800, ~68px desktop
  Word "AI." in color #ff8000, rest white
- Subtitle: gray (#888), max-width 440px, DM Sans 300
- Two CTA buttons:
  Primary: "Start creating" — #ff8000 bg, black text, hover scale up
  Secondary: "See examples" — white text, white border rgba(255,255,255,0.2)
- Subtle orange radial glow behind hero text (not visible on mobile)
- Fade-up animation on load for all elements (staggered)

## Feature Cards Rules
Row 1 — 3 equal columns (gap-3):
  1. Text card — dark preview with blinking cursor, fake text lines, COPY/POST/SCRIPT tags
  2. Image card — abstract gradient shapes preview, thumbnail variants
  3. Video card — play button, orange progress bar, KLING/RUNWAY model tags

Row 2 — 2 columns (gap-3):
  4. Audio card (horizontal layout) — animated equalizer bars, red (#ff3366) color
  5. Edit card (horizontal layout) — shimmer layer animation, teal (#00ffc8) color

Each card:
- rounded-2xl
- border border-white/[0.06]
- bg: #0f0f0f
- hover: border-orange-500/20 + translateY(-4px) + shadow-xl
- transition: all 0.28s ease
- Staggered fade-up animation on load

## Stats Bar (below cards)
4 stats in a row, separated by borders:
- 10+ AI Models
- 5 Content types  
- Free to start
- 🇺🇦 Made with love
Border: 1px solid var(--border), rounded-xl, max-width 640px, centered

## Animation Rules
- All sections: fadeUp keyframe (translateY 20px → 0, opacity 0 → 1)
- Duration: 0.6-0.8s ease
- Stagger delays: 0.1s between elements
- Hover transitions: 0.2-0.28s ease
- Pulsing dot: 2s ease infinite (opacity 1 → 0.3 → 1)
- Blinking cursor: 1s step-end infinite
- Audio bars: staggered animation, 1s ease infinite per bar
- Shimmer: 2.2s ease infinite translateX

## Responsive Breakpoints
- Mobile (< 768px): single column cards, smaller hero text, hidden nav tabs
- Tablet (768-1024px): 2 column cards
- Desktop (> 1024px): full 3+2 column layout

## Code Rules — Always
- TypeScript strict mode
- CSS variables for ALL colors (never hardcode hex in components)
- Semantic HTML (header, nav, main, section)
- Mobile-first responsive design
- 'use client' only when needed (hover states, animations)
- Clean component separation — one component per file
- Meaningful comments in English

## Code Rules — Never
- Never use purple gradients
- Never use light/white backgrounds anywhere
- Never use Arial, Inter, Roboto or system fonts
- Never hardcode colors — always use CSS variables
- Never use inline styles
- Never install unnecessary packages

## When I ask you something in Ukrainian
- Understand Ukrainian, respond in Ukrainian
- Code comments always in English
/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./app/**/*.{js,jsx,ts,tsx}',
		'./components/**/*.{js,jsx,ts,tsx}',
		'./node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
	],
	safelist: [
		{
			pattern: /^(bg|text|border|ring|stroke|fill)-(blue|emerald|violet|amber|cyan|rose)-[0-9]+$/,
		},
	],
	theme: {
		extend: {
			colors: {
				// MindCraft Design System Colors
				primary: '#5FBF4A', // Grass Green
				secondary: '#3B6EA5', // Deep Blue
				accent: '#7FE7FF', // Diamond
				dirt: '#795548', // Dirt Brown
				stone: '#9E9E9E', // Stone Grey
				neutralDark: '#1B1B1B', // Coal Black
				neutralLight: '#F0F0F0',
				success: '#4BB543',
				warning: '#FFB200',
				error: '#E63946',
				// shadcn/ui compatibility
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				card: '1rem', // rounded-xl equivalent
			},
			// 8px spacing grid system
			spacing: {
				'4': '4px',
				'8': '8px',
				'12': '12px',
				'16': '16px',
				'24': '24px',
				'32': '32px',
				'48': '48px',
				'64': '64px',
			},
			// Typography scale from design system
			fontFamily: {
				sans: ['"Roboto"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				roboto: ['"Roboto"', 'sans-serif'],
				pixel: ['"VT323"', 'monospace'],
				'pixel-heading': ['"VT323"', 'monospace'],
				'pixel-body': ['"VT323"', 'monospace'],
			},
			fontSize: {
				'h1': ['29px', { lineHeight: '1.2', fontWeight: '600' }],
				'h2': ['22px', { lineHeight: '1.3', fontWeight: '600' }],
				'h3': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
				'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
				'caption': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
			},
			boxShadow: {
				'pixel': '4px 4px 0px 0px rgba(0,0,0,1)',
				'pixel-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
				'pixel-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
			},
			// Motion principles: fast (120-200ms)
			transitionDuration: {
				'120': '120ms',
				'200': '200ms',
			},
			// Subtle animations
			scale: {
				'105': '1.05',
			},
			animation: {
				blob: "blob 7s infinite",
				float: "float 6s ease-in-out infinite",
				fadeIn: "fadeIn 0.5s ease-out forwards",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: "0", transform: "translateY(10px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				blob: {
					"0%": {
						transform: "translate(0px, 0px) scale(1)",
					},
					"33%": {
						transform: "translate(30px, -50px) scale(1.1)",
					},
					"66%": {
						transform: "translate(-20px, 20px) scale(0.9)",
					},
					"100%": {
						transform: "translate(0px, 0px) scale(1)",
					},
				},
				float: {
					"0%, 100%": {
						transform: "translateY(0)",
					},
					"50%": {
						transform: "translateY(-20px)",
					},
				},
			},
		},
	},
	plugins: [
		function ({ addUtilities }) {
			addUtilities({
				'.animation-delay-2000': {
					'animation-delay': '2s',
				},
				'.animation-delay-4000': {
					'animation-delay': '4s',
				},
			});
		},
	],
};

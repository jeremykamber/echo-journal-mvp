import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        primary- foreground: {
  DEFAULT: 'hsl(var(--primary-foreground))',
    foreground: 'hsl(var(--primary-foreground-foreground))'
},
destructive: {
  DEFAULT: 'hsl(var(--destructive))',
    foreground: 'hsl(var(--destructive-foreground))'
},
muted: {
  DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))'
},
accent: {
  DEFAULT: 'hsl(var(--accent))',
    foreground: 'hsl(var(--accent-foreground))'
},
popover: {
  DEFAULT: 'hsl(var(--popover))',
    foreground: 'hsl(var(--popover-foreground))'
},
card: {
  DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))'
},
sidebar: {
  DEFAULT: 'hsl(var(--sidebar-background))',
    foreground: 'hsl(var(--sidebar-foreground))',
      primary: 'hsl(var(--sidebar-primary))',
        'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
            'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
              border: 'hsl(var(--sidebar-border))',
                ring: 'hsl(var(--sidebar-ring))'
},
// Echo custom colors
custom: {
  primary: '#4E95F6',
    primary - foreground: '#E5F0FF',
      accent: '#1E3A5F',
        background: '#F8FAFC',
          foreground: '#2D3748',
            light: '#FFFAF0',
              mist: '#F5F9FF'
}
      },
borderRadius: {
  lg: 'var(--radius)',
    md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)'
},
keyframes: {
  'accordion-down': {
    from: {
      height: '0'
    },
    to: {
      height: 'var(--radix-accordion-content-height)'
    }
  },
  'accordion-up': {
    from: {
      height: 'var(--radix-accordion-content-height)'
    },
    to: {
      height: '0'
    }
  },
  'fade-in': {
    '0%': {
      opacity: '0',
        transform: 'translateY(10px)'
    },
    '100%': {
      opacity: '1',
        transform: 'translateY(0)'
    },
  },
  'slide-up': {
    '0%': {
      opacity: '0',
        transform: 'translateY(20px)'
    },
    '100%': {
      opacity: '1',
        transform: 'translateY(0)'
    },
  },
  'pulse-soft': {
    '0%, 100%': {
      opacity: '1',
          },
    '50%': {
      opacity: '0.8',
          },
  },
  'reveal-text': {
    '0%': {
      width: '0%',
          },
    '100%': {
      width: '100%',
          },
  }
},
animation: {
  'accordion-down': 'accordion-down 0.2s ease-out',
    'accordion-up': 'accordion-up 0.2s ease-out',
      'fade-in': 'fade-in 0.8s ease-out forwards',
        'slide-up': 'slide-up 0.9s ease-out forwards',
          'pulse-soft': 'pulse-soft 3s infinite ease-in-out',
            'reveal-text': 'reveal-text 0.8s ease-out forwards'
},
fontFamily: {
  sans: ['Inter', 'sans-serif'],
    serif: ['"Playfair Display"', 'serif']
},
boxShadow: {
  'subtle': '0 10px 30px -12px rgba(0, 0, 0, 0.1)',
    'hover': '0 10px 40px -12px rgba(78, 149, 246, 0.25)'
},
backgroundImage: {
  'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
    'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")"
}
    }
  },
plugins: [require("tailwindcss-animate")],
} satisfies Config;

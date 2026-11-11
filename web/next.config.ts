import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	cacheComponents: true,
	partialPrefetching: true,
	poweredByHeader: false,
	turbopack: {
		rules: {
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
	async redirects() {
		return [{ source: "/", destination: "/projets", permanent: false }]
	},
}

export default nextConfig

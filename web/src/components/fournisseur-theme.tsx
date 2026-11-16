"use client"

import { ThemeProvider } from "next-themes"
import type { ComponentProps } from "react"

/** Thème clair, sombre ou celui du système, appliqué par la classe `dark` sur `<html>`. */
export function FournisseurTheme(props: ComponentProps<typeof ThemeProvider>) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
			{...props}
		/>
	)
}

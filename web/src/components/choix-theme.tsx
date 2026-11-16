"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Menu de choix du thème : clair, sombre ou celui du système. */
export function ChoixTheme() {
	const { theme, setTheme } = useTheme()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" aria-label="Changer de thème">
					<SunIcon className="dark:hidden" />
					<MoonIcon className="hidden dark:block" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
					<DropdownMenuRadioItem value="light">
						<SunIcon /> Clair
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="dark">
						<MoonIcon /> Sombre
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="system">
						<MonitorIcon /> Système
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

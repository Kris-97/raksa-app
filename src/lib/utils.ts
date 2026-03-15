import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fi-FI", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("fi-FI", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function budgetHealthColor(usedPercent: number): string {
  if (usedPercent >= 95) return "text-red-600 bg-red-50";
  if (usedPercent >= 80) return "text-amber-600 bg-amber-50";
  return "text-green-600 bg-green-50";
}

export function budgetHealthBadge(usedPercent: number): { label: string; variant: "destructive" | "warning" | "success" } {
  if (usedPercent >= 95) return { label: "Ylittymässä", variant: "destructive" };
  if (usedPercent >= 80) return { label: "Varoitus", variant: "warning" };
  return { label: "OK", variant: "success" };
}

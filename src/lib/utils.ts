import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toSafeText(value: unknown, fallback = "") {
  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value).trim() || fallback;
}

export const safeUpper = (value: unknown, fallback = "") =>
  String(value ?? fallback).toUpperCase();

export function toSafeUpperText(value: unknown, fallback = "") {
  return safeUpper(toSafeText(value, fallback));
}

"use client"

import React, { useState, useMemo } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Route,
  RefreshCw,
  Copy,
  Check,
  X,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Snowflake,
  Box,
  Search,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"

export interface RouteOption {
  text: string
  origin: string
  destination: string
  containerType: "dry" | "reefer" | "mixed" | "full_reefer"
  isSwitchBl?: boolean
  switchLocation?: string
}

export interface RouteGroup {
  id: string
  label: string
  sublabel: string
  badgeColor: string
  pillActiveColor: string
  pillHoverColor: string
  options: RouteOption[]
}

const ROUTE_GROUPS: RouteGroup[] = [
  {
    id: "dogharoun",
    label: "دوغارون",
    sublabel: "Dogharoun — Iran/Khorasan (Full Way Reefer & Switch B/L)",
    badgeColor: "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
    pillActiveColor: "border-sky-600 bg-sky-600 text-white shadow-xs",
    pillHoverColor: "border-sky-200 bg-white text-sky-950 hover:border-sky-400 hover:bg-sky-50/70 dark:bg-slate-900 dark:border-slate-800 dark:text-sky-200",
    options: [
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)",
        origin: "دوغارون",
        destination: "دبی / جبل علی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در بندرعباس (Full Way Reefer)",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در بندر مرسین ترکیه (Full Way Reefer)",
        origin: "دوغارون",
        destination: "مرسین / اروپا",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "مرسین ترکیه",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در موندرا / نهاوا شیوا هند (Full Way Reefer)",
        origin: "دوغارون",
        destination: "هند (Mundra / Nhava Sheva)",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "موندرا هند",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی تا جبل علی / دبی (Full Way Reefer)",
        origin: "دوغارون",
        destination: "جبل علی / دبی",
        containerType: "full_reefer",
      },
      {
        text: "از دوغارون تمام مسیر کانتینر یخچالی (Full Way Reefer)",
        origin: "دوغارون",
        destination: "مقصد نهایی",
        containerType: "full_reefer",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی (تمام مسیر یخچالی - Full Way Reefer)",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "full_reefer",
      },
      {
        text: "از دوغارون کانتینر یخچالی تا مقصد نهایی (تمام مسیر یخچالی)",
        origin: "دوغارون",
        destination: "مقصد نهایی",
        containerType: "full_reefer",
      },
      {
        text: "از دوغارون کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در بندرعباس)",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از دوغارون کانتینر معمولی از بندرعباس کانتینر یخچالی",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "mixed",
      },
      {
        text: "از دوغارون کانتینر معمولی از بندرعباس کانتینر معمولی",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "dry",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "reefer",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر معمولی",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "mixed",
      },
      {
        text: "مسیر از دوغارون کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال)",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
    ],
  },
  {
    id: "switch-bl",
    label: "🔄 سوییچ بی ال",
    sublabel: "Switch B/L Dedicated — Transshipment Hubs",
    badgeColor: "border-purple-300 bg-purple-100 text-purple-900 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    pillActiveColor: "border-purple-600 bg-purple-600 text-white shadow-xs",
    pillHoverColor: "border-purple-200 bg-white text-purple-900 hover:border-purple-400 hover:bg-purple-50/70 dark:bg-slate-900 dark:border-slate-800 dark:text-purple-300",
    options: [
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)",
        origin: "دوغارون",
        destination: "دبی / جبل علی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در بندرعباس (Full Way Reefer)",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در بندر مرسین ترکیه (Full Way Reefer)",
        origin: "دوغارون",
        destination: "مرسین ترکیه",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "مرسین ترکیه",
      },
      {
        text: "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در موندرا / نهاوا شیوا هند (Full Way Reefer)",
        origin: "دوغارون",
        destination: "هند",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "موندرا هند",
      },
      {
        text: "از اسلام قلعه کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)",
        origin: "اسلام قلعه",
        destination: "دبی / جبل علی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از اسلام قلعه کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در بندرعباس (Full Way Reefer)",
        origin: "اسلام قلعه",
        destination: "بندرعباس",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از نیمروز کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)",
        origin: "نیمروز",
        destination: "دبی / جبل علی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از نیمروز کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در بندرعباس (Full Way Reefer)",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از تورغندی کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)",
        origin: "تورغندی",
        destination: "دبی / جبل علی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از حیرتان کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)",
        origin: "حیرتان",
        destination: "دبی / جبل علی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از سپین بولدک کانتینر یخچالی از کراچی کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)",
        origin: "سپین بولدک",
        destination: "دبی / جبل علی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از دوغارون کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در بندرعباس)",
        origin: "دوغارون",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "سوییچ بی ال در بندرعباس",
        origin: "بندرعباس",
        destination: "مقصد نهایی",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "سوییچ بی ال در جبل علی / دبی",
        origin: "جبل علی",
        destination: "دبی / مقصد نهایی",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "جبل علی",
      },
      {
        text: "سوییچ بی ال در بندر مرسین ترکیه",
        origin: "مرسین",
        destination: "اروپا / مدیترانه",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "مرسین",
      },
      {
        text: "بارنامه سوییچ با تغییر مشخصات فرستنده و خریدار",
        origin: "ترانزیت",
        destination: "Switch Consignee",
        containerType: "mixed",
        isSwitchBl: true,
      },
      {
        text: "از اسلام قلعه تمام مسیر کانتینر یخچالی (با سوییچ بی ال در بندرعباس)",
        origin: "اسلام قلعه",
        destination: "بندرعباس",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از اسلام قلعه کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در بندرعباس)",
        origin: "اسلام قلعه",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از نیمروز کانتینر یخچالی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در بندرعباس - تمام مسیر یخچالی)",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از نیمروز تمام مسیر کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)",
        origin: "نیمروز",
        destination: "دبی / جبل علی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از نیمروز تمام مسیر کانتینر یخچالی (با سوییچ بی ال در بندرعباس)",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از نیمروز کانتینر یخچالی از چابهار کانتینر یخچالی (با سوییچ بی ال در چابهار / دبی)",
        origin: "نیمروز",
        destination: "چابهار / دبی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "چابهار / دبی",
      },
      {
        text: "از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در دبی / جبل علی)",
        origin: "نیمروز",
        destination: "دبی / جبل علی",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در بندرعباس)",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از سپین بولدک کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال)",
        origin: "سپین بولدک",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
      },
      {
        text: "از حیرتان کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال)",
        origin: "حیرتان",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
      },
      {
        text: "از تورغندی کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال)",
        origin: "تورغندی",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
      },
    ],
  },
  {
    id: "islam-qala",
    label: "اسلام قلعه",
    sublabel: "Islam Qala — Herat Border",
    badgeColor: "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    pillActiveColor: "border-blue-600 bg-blue-600 text-white shadow-xs",
    pillHoverColor: "border-blue-200 bg-white text-blue-900 hover:border-blue-400 hover:bg-blue-50/70 dark:bg-slate-900 dark:border-slate-800 dark:text-blue-300",
    options: [
      {
        text: "از اسلام قلعه تمام مسیر کانتینر یخچالی (Full Way Reefer)",
        origin: "اسلام قلعه",
        destination: "مقصد نهایی",
        containerType: "full_reefer",
      },
      {
        text: "از اسلام قلعه کانتینر معمولی از بندرعباس کانتینر معمولی",
        origin: "اسلام قلعه",
        destination: "بندرعباس",
        containerType: "dry",
      },
      {
        text: "از اسلام قلعه کانتینر معمولی از بندرعباس کانتینر یخچالی",
        origin: "اسلام قلعه",
        destination: "بندرعباس",
        containerType: "mixed",
      },
      {
        text: "از اسلام قلعه کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در بندرعباس)",
        origin: "اسلام قلعه",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از اسلام قلعه کانتینر یخچالی از بندرعباس کانتینر یخچالی",
        origin: "اسلام قلعه",
        destination: "بندرعباس",
        containerType: "reefer",
      },
      {
        text: "از اسلام قلعه کانتینر یخچالی از بندرعباس کانتینر معمولی",
        origin: "اسلام قلعه",
        destination: "بندرعباس",
        containerType: "mixed",
      },
      {
        text: "مسیر از اسلام قلعه کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال)",
        origin: "اسلام قلعه",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "مسیر از اسلام قلعه کانتینر معمولی از بندرعباس کانتینر یخچالی با سوییچ بارنامه در دبی",
        origin: "اسلام قلعه",
        destination: "دبی",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "دبی",
      },
    ],
  },
  {
    id: "nimroz",
    label: "نیمروز",
    sublabel: "Nimroz — Iran/Sistan Border (Full Way Reefer & Switch B/L)",
    badgeColor: "border-rose-300 bg-rose-100 text-rose-900 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
    pillActiveColor: "border-rose-600 bg-rose-600 text-white shadow-xs",
    pillHoverColor: "border-rose-200 bg-white text-rose-900 hover:border-rose-400 hover:bg-rose-50/70 dark:bg-slate-900 dark:border-slate-800 dark:text-rose-300",
    options: [
      {
        text: "از نیمروز تمام مسیر کانتینر یخچالی (Full Way Reefer)",
        origin: "نیمروز",
        destination: "مقصد نهایی",
        containerType: "full_reefer",
      },
      {
        text: "از نیمروز کانتینر یخچالی از بندرعباس کانتینر یخچالی (تمام مسیر یخچالی - Full Way Reefer)",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "full_reefer",
      },
      {
        text: "از نیمروز کانتینر یخچالی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در بندرعباس - تمام مسیر یخچالی)",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از نیمروز تمام مسیر کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)",
        origin: "نیمروز",
        destination: "دبی / جبل علی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از نیمروز تمام مسیر کانتینر یخچالی (با سوییچ بی ال در بندرعباس)",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "از نیمروز کانتینر یخچالی تا مقصد نهایی (تمام مسیر یخچالی)",
        origin: "نیمروز",
        destination: "مقصد نهایی",
        containerType: "full_reefer",
      },
      {
        text: "از نیمروز کانتینر یخچالی از چابهار کانتینر یخچالی (تمام مسیر یخچالی - Full Way Reefer)",
        origin: "نیمروز",
        destination: "چابهار",
        containerType: "full_reefer",
      },
      {
        text: "از نیمروز کانتینر یخچالی از چابهار کانتینر یخچالی (با سوییچ بی ال در چابهار / دبی)",
        origin: "نیمروز",
        destination: "چابهار / دبی",
        containerType: "full_reefer",
        isSwitchBl: true,
        switchLocation: "چابهار / دبی",
      },
      {
        text: "از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در دبی / جبل علی)",
        origin: "نیمروز",
        destination: "دبی / جبل علی",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "دبی / جبل علی",
      },
      {
        text: "از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در بندرعباس)",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "مسیر از نیمروز کانتینر معمولی از چابهار کانتینر یخچالی (با سوییچ بی ال)",
        origin: "نیمروز",
        destination: "چابهار",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "چابهار",
      },
      {
        text: "از نیمروز کانتینر معمولی از بندرعباس کانتینر معمولی",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "dry",
      },
      {
        text: "از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "mixed",
      },
      {
        text: "از نیمروز کانتینر یخچالی از بندرعباس کانتینر یخچالی",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "reefer",
      },
      {
        text: "از نیمروز کانتینر یخچالی از بندرعباس کانتینر معمولی",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "mixed",
      },
      {
        text: "مسیر از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال)",
        origin: "نیمروز",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "مسیر از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی با سوییچ بارنامه در دبی",
        origin: "نیمروز",
        destination: "دبی",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "دبی",
      },
    ],
  },
  {
    id: "torghundi",
    label: "تورغندی",
    sublabel: "Torghundi — Turkmenistan",
    badgeColor: "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    pillActiveColor: "border-emerald-600 bg-emerald-600 text-white shadow-xs",
    pillHoverColor: "border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50/70 dark:bg-slate-900 dark:border-slate-800 dark:text-emerald-300",
    options: [
      {
        text: "از تورغندی کانتینر معمولی از بندرعباس کانتینر معمولی",
        origin: "تورغندی",
        destination: "بندرعباس",
        containerType: "dry",
      },
      {
        text: "از تورغندی کانتینر معمولی از بندرعباس کانتینر یخچالی",
        origin: "تورغندی",
        destination: "بندرعباس",
        containerType: "mixed",
      },
      {
        text: "از تورغندی کانتینر یخچالی از بندرعباس کانتینر یخچالی",
        origin: "تورغندی",
        destination: "بندرعباس",
        containerType: "reefer",
      },
      {
        text: "مسیر از تورغندی کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال)",
        origin: "تورغندی",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
    ],
  },
  {
    id: "hairatan",
    label: "حیرتان",
    sublabel: "Hairatan — Uzbekistan",
    badgeColor: "border-indigo-300 bg-indigo-100 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
    pillActiveColor: "border-indigo-600 bg-indigo-600 text-white shadow-xs",
    pillHoverColor: "border-indigo-200 bg-white text-indigo-900 hover:border-indigo-400 hover:bg-indigo-50/70 dark:bg-slate-900 dark:border-slate-800 dark:text-indigo-300",
    options: [
      {
        text: "از حیرتان کانتینر معمولی از بندرعباس کانتینر معمولی",
        origin: "حیرتان",
        destination: "بندرعباس",
        containerType: "dry",
      },
      {
        text: "از حیرتان کانتینر معمولی از بندرعباس کانتینر یخچالی",
        origin: "حیرتان",
        destination: "بندرعباس",
        containerType: "mixed",
      },
      {
        text: "از حیرتان کانتینر یخچالی از بندرعباس کانتینر یخچالی",
        origin: "حیرتان",
        destination: "بندرعباس",
        containerType: "reefer",
      },
      {
        text: "مسیر از حیرتان کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال)",
        origin: "حیرتان",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
    ],
  },
  {
    id: "spin-boldak",
    label: "سپین بولدک",
    sublabel: "Spin Boldak — Pakistan Border",
    badgeColor: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    pillActiveColor: "border-amber-600 bg-amber-600 text-white shadow-xs",
    pillHoverColor: "border-amber-200 bg-white text-amber-900 hover:border-amber-400 hover:bg-amber-50/70 dark:bg-slate-900 dark:border-slate-800 dark:text-amber-300",
    options: [
      {
        text: "از سپین بولدک کانتینر معمولی از بندرعباس کانتینر معمولی",
        origin: "سپین بولدک",
        destination: "بندرعباس",
        containerType: "dry",
      },
      {
        text: "از سپین بولدک کانتینر معمولی از بندرعباس کانتینر یخچالی",
        origin: "سپین بولدک",
        destination: "بندرعباس",
        containerType: "mixed",
      },
      {
        text: "از سپین بولدک کانتینر یخچالی از بندرعباس کانتینر یخچالی",
        origin: "سپین بولدک",
        destination: "بندرعباس",
        containerType: "reefer",
      },
      {
        text: "مسیر از سپین بولدک کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال)",
        origin: "سپین بولدک",
        destination: "بندرعباس",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "بندرعباس",
      },
      {
        text: "مسیر از سپین بولدک کانتینر معمولی از کراچی به جبل علی با سوییچ بی ال",
        origin: "سپین بولدک",
        destination: "جبل علی",
        containerType: "mixed",
        isSwitchBl: true,
        switchLocation: "کراچی / جبل علی",
      },
    ],
  },
]

interface RoutePresetSelectorProps {
  value: string
  onChange: (newValue: string) => void
}

export function RoutePresetSelector({ value, onChange }: RoutePresetSelectorProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>("all")
  const [containerFilter, setContainerFilter] = useState<"all" | "full_reefer" | "reefer" | "dry" | "switch_only">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [hasCopied, setHasCopied] = useState(false)

  // Detect whether current route text currently includes Switch B/L
  const hasSwitchBl = useMemo(() => {
    if (!value) return false
    return /سوی[ی]?چ\s*(بی\s*ال|B\/L|بارنامه)/i.test(value) || /switch\s*b\/?l/i.test(value)
  }, [value])

  // Detect whether current route text is Full Way Reefer
  const isFullWayReefer = useMemo(() => {
    if (!value) return false
    return /تمام\s*مسیر\s*(کانتینر\s*)?یخچالی/i.test(value) || /full\s*way\s*reefer/i.test(value)
  }, [value])

  const handleCopy = () => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setHasCopied(true)
    toast.success("متن مسیر کاپی شد!")
    setTimeout(() => setHasCopied(false), 2000)
  }

  const handleToggleSwitchBl = (location: string = "بندرعباس") => {
    const switchSuffix = ` (با سوییچ بی ال در ${location})`
    const genericPattern = /\s*\((با\s*)?سوی[ی]?چ\s*(بی\s*ال|B\/L|بارنامه)[^)]*\)/gi

    if (hasSwitchBl) {
      const cleaned = value.replace(genericPattern, "").trim()
      onChange(cleaned)
      toast.info("گزینه سوییچ بی ال حذف شد")
    } else {
      if (!value.trim()) {
        onChange(`سوییچ بی ال در ${location}`)
      } else {
        onChange(`${value.trim()}${switchSuffix}`)
      }
      toast.success(`گزینه سوییچ بی ال در ${location} اضافه شد!`)
    }
  }

  const handleToggleFullWayReefer = (origin: string = "دوغارون") => {
    const fullWayPreset = `از ${origin} تمام مسیر کانتینر یخچالی (Full Way Reefer)`
    if (!value.trim()) {
      onChange(fullWayPreset)
      toast.success(`مسیر تمام یخچالی ${origin} اعمال شد!`)
    } else if (value.includes("تمام مسیر کانتینر یخچالی") || value.includes("Full Way Reefer")) {
      // Toggle off or clean
      const cleaned = value.replace(/\s*\(?تمام مسیر کانتینر یخچالی(\s*-\s*Full Way Reefer)?\)?/gi, "").trim()
      onChange(cleaned)
      toast.info("وضعیت تمام مسیر یخچالی حذف شد")
    } else {
      onChange(fullWayPreset)
      toast.success(`مسیر "${fullWayPreset}" اعمال شد!`)
    }
  }

  const handleAppendFragment = (fragment: string) => {
    if (!value.trim()) {
      onChange(fragment)
    } else if (!value.includes(fragment)) {
      onChange(`${value.trim()} ${fragment}`)
    }
  }

  // Filter options based on active station, container filter, and search
  const displayedGroups = useMemo(() => {
    let groups = ROUTE_GROUPS
    if (selectedGroup !== "all") {
      groups = groups.filter((g) => g.id === selectedGroup)
    }

    const query = searchQuery.trim().toLowerCase()

    return groups
      .map((g) => {
        let filtered = g.options

        if (containerFilter === "full_reefer") {
          filtered = filtered.filter((o) => o.containerType === "full_reefer")
        } else if (containerFilter === "reefer") {
          filtered = filtered.filter((o) => o.containerType === "reefer" || o.containerType === "full_reefer")
        } else if (containerFilter === "dry") {
          filtered = filtered.filter((o) => o.containerType === "dry")
        } else if (containerFilter === "switch_only") {
          filtered = filtered.filter((o) => o.isSwitchBl)
        }

        if (query) {
          filtered = filtered.filter(
            (o) =>
              o.text.toLowerCase().includes(query) ||
              o.origin.toLowerCase().includes(query) ||
              o.destination.toLowerCase().includes(query)
          )
        }

        return { ...g, options: filtered }
      })
      .filter((g) => g.options.length > 0)
  }, [selectedGroup, containerFilter, searchQuery])

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-linear-to-b from-slate-50/70 via-white to-slate-50/40 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-5 shadow-xs space-y-3.5">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 dark:border-sky-800 bg-sky-100/90 dark:bg-sky-950/70 px-3 py-1 text-xs font-black uppercase tracking-wider text-sky-900 dark:text-sky-300 shadow-2xs">
            <Route className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>ROUTE & SWITCH B/L / متن مسیر و بارنامه سوییچ</span>
          </span>
          {isFullWayReefer && (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300 bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/70 px-2.5 py-0.5 text-[11px] font-bold text-cyan-900 dark:text-cyan-300">
              <Snowflake className="h-3 w-3 text-cyan-600 animate-pulse" />
              تمام مسیر یخچالی (Full Way Reefer)
            </span>
          )}
          {hasSwitchBl && (
            <span className="inline-flex items-center gap-1 rounded-full border border-purple-300 bg-purple-100 dark:border-purple-800 dark:bg-purple-950/70 px-2.5 py-0.5 text-[11px] font-bold text-purple-900 dark:text-purple-300">
              <RefreshCw className="h-3 w-3 text-purple-600" />
              سوییچ B/L فعال
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {value && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs hover:bg-slate-100 transition-all cursor-pointer"
                title="کاپی کردن متن مسیر"
              >
                {hasCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{hasCopied ? "کاپی شد" : "کپی متن"}</span>
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="flex items-center gap-1 rounded-lg border border-rose-200 bg-white dark:bg-slate-800 dark:border-slate-700 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 shadow-2xs hover:border-rose-400 hover:bg-rose-50 hover:text-rose-800 transition-all cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>پاک کردن</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Textarea Display */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span>Route text / متن مسیر بر روی بارنامه (چاپ شده با رنگ مشخص)</span>
          {value ? (
            <span className="text-[11px] font-semibold text-slate-500 font-mono">
              {value.length} کاراکتر
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">یک مسیر را از گزینه‌ها انتخاب نمایید</span>
          )}
        </div>
        <Textarea
          id="cargo-route-note"
          name="cargo_route_note"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          dir="rtl"
          rows={2}
          placeholder="مسیر را از گزینه‌های پایین انتخاب کنید یا متن دلخواه را اینجا بنویسید…"
          className="min-h-[3.75rem] w-full resize-y rounded-xl border-2 border-sky-200 dark:border-sky-900/70 bg-white dark:bg-slate-900 p-3 text-center font-[vazirmatn] text-base sm:text-lg font-black leading-snug text-slate-900 dark:text-slate-100 shadow-inner transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:border-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 dark:focus-visible:ring-sky-900"
        />
      </div>

      {/* PROMINENT SWITCH B/L & FULL WAY REEFER ACTION BAR */}
      <div className="rounded-xl border border-sky-200/90 dark:border-sky-900/70 bg-gradient-to-r from-sky-50/80 via-white to-purple-50/80 dark:from-sky-950/40 dark:via-slate-900 dark:to-purple-950/40 p-2.5 shadow-2xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2" dir="rtl">
          {/* Section Heading with properly isolated LTR parenthetical text to fix colon direction */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="p-1 rounded-md bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="font-[vazirmatn] text-xs font-black text-slate-900 dark:text-slate-100">
              گزینه‌های سریع مسیر و سوییچ بارنامه:
            </span>
            <span dir="ltr" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-sans">
              (Quick Route & Switch B/L Modifiers)
            </span>
          </div>

          {/* Action Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Primary: From Dogharoun Full Way Reefer */}
            <button
              type="button"
              onClick={() => handleToggleFullWayReefer("دوغارون")}
              className={`rounded-lg border px-2.5 py-1 text-xs font-[vazirmatn] font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                value.includes("از دوغارون تمام مسیر کانتینر یخچالی") || (value.includes("دوغارون") && isFullWayReefer && !value.includes("با سوییچ بی ال در دبی"))
                  ? "bg-sky-600 border-sky-600 text-white shadow-sky-200"
                  : "bg-sky-50 hover:bg-sky-100 border-sky-300 dark:border-sky-800 dark:bg-sky-950/80 text-sky-900 dark:text-sky-200"
              }`}
              title="اعمال مستقیم مسیر تمام یخچالی از دوغارون"
            >
              <Snowflake className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
              <span>
                {value.includes("از دوغارون تمام مسیر کانتینر یخچالی")
                  ? "✓ دوغارون تمام مسیر یخچالی"
                  : "❄️ دوغارون تمام مسیر یخچالی (Full Way Reefer)"}
              </span>
            </button>

            {/* Direct: From Dogharoun Reefer to Dubai via Switch BL (User exact sentence) */}
            <button
              type="button"
              onClick={() => {
                const targetText = "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)"
                onChange(targetText)
                toast.success("مسیر دوغارون کانتینر یخچالی با سوییچ B/L در دبی اعمال شد!")
              }}
              className={`rounded-lg border px-2.5 py-1 text-xs font-[vazirmatn] font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                value === "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)"
                  ? "bg-purple-700 border-purple-700 text-white shadow-purple-200"
                  : "bg-purple-50 hover:bg-purple-100 border-purple-300 dark:border-purple-800 dark:bg-purple-950/70 text-purple-950 dark:text-purple-200"
              }`}
              title="اعمال سریع: از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)"
            >
              <Snowflake className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
              <span>
                {value === "از دوغارون کانتینر یخچالی از بندرعباس کانتینر یخچالی با سوییچ بی ال در دبی / جبل علی (Full Way Reefer)"
                  ? "✓ دوغارون به دبی با سوییچ B/L (Full Reefer)"
                  : "❄️ دوغارون به دبی با سوییچ B/L (Full Reefer)"}
              </span>
            </button>

            {/* Primary: From Nimroz Full Way Reefer */}
            <button
              type="button"
              onClick={() => handleToggleFullWayReefer("نیمروز")}
              className={`rounded-lg border px-2.5 py-1 text-xs font-[vazirmatn] font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                value.includes("از نیمروز تمام مسیر کانتینر یخچالی") || (value.includes("نیمروز") && isFullWayReefer)
                  ? "bg-rose-600 border-rose-600 text-white shadow-rose-200"
                  : "bg-rose-50 hover:bg-rose-100 border-rose-300 dark:border-rose-800 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200"
              }`}
              title="اعمال مستقیم مسیر تمام یخچالی از نیمروز"
            >
              <Snowflake className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
              <span>
                {value.includes("از نیمروز تمام مسیر کانتینر یخچالی")
                  ? "✓ نیمروز تمام مسیر یخچالی"
                  : "❄️ نیمروز تمام مسیر یخچالی (Full Way Reefer)"}
              </span>
            </button>

            {/* Direct: From Nimroz Dry to Bandar Abbas Reefer with Switch BL at Dubai (User requested exact sentence) */}
            <button
              type="button"
              onClick={() => {
                const targetText = "از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در دبی / جبل علی)"
                onChange(targetText)
                toast.success("مسیر نیمروز معمولی ← یخچالی با سوییچ B/L در دبی اعمال شد!")
              }}
              className={`rounded-lg border px-2.5 py-1 text-xs font-[vazirmatn] font-black transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                value === "از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در دبی / جبل علی)"
                  ? "bg-amber-600 border-amber-600 text-white shadow-amber-200"
                  : "bg-amber-50 hover:bg-amber-100 border-amber-300 dark:border-amber-800 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200"
              }`}
              title="اعمال سریع: از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در دبی / جبل علی)"
            >
              <RefreshCw className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                {value === "از نیمروز کانتینر معمولی از بندرعباس کانتینر یخچالی (با سوییچ بی ال در دبی / جبل علی)"
                  ? "✓ نیمروز به دبی سوییچ B/L (معمولی ← یخچالی)"
                  : "📦 نیمروز به دبی سوییچ B/L (معمولی ← ❄️ یخچالی)"}
              </span>
            </button>

            {/* Switch B/L at Bandar Abbas */}
            <button
              type="button"
              onClick={() => handleToggleSwitchBl("بندرعباس")}
              className={`rounded-lg border px-2.5 py-1 text-xs font-[vazirmatn] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                hasSwitchBl && value.includes("بندرعباس")
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 hover:bg-purple-100/70"
              }`}
            >
              <RefreshCw className="h-3 w-3" />
              <span>{hasSwitchBl && value.includes("بندرعباس") ? "✓ سوییچ بی ال بندرعباس" : "+ سوییچ بی ال بندرعباس"}</span>
            </button>

            {/* Switch B/L at Dubai / Jebel Ali */}
            <button
              type="button"
              onClick={() => handleToggleSwitchBl("دبی / جبل علی")}
              className={`rounded-lg border px-2.5 py-1 text-xs font-[vazirmatn] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                hasSwitchBl && value.includes("دبی")
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 hover:bg-purple-100/70"
              }`}
            >
              <RefreshCw className="h-3 w-3" />
              <span>{hasSwitchBl && value.includes("دبی") ? "✓ سوییچ بی ال جبل علی" : "+ سوییچ بی ال جبل علی"}</span>
            </button>

            {/* Switch B/L at Chabahar */}
            <button
              type="button"
              onClick={() => handleToggleSwitchBl("چابهار")}
              className={`rounded-lg border px-2.5 py-1 text-xs font-[vazirmatn] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                hasSwitchBl && value.includes("چابهار")
                  ? "bg-purple-600 border-purple-600 text-white"
                  : "bg-white dark:bg-slate-800 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 hover:bg-purple-100/70"
              }`}
            >
              <RefreshCw className="h-3 w-3" />
              <span>{hasSwitchBl && value.includes("چابهار") ? "✓ سوییچ بی ال چابهار" : "+ سوییچ بی ال چابهار"}</span>
            </button>

            {/* Append Fragments */}
            <button
              type="button"
              onClick={() => handleAppendFragment("کانتینر یخچالی")}
              className="rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50/70 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 px-2 py-1 text-xs font-[vazirmatn] font-bold hover:bg-cyan-100 transition-all cursor-pointer flex items-center gap-1"
            >
              <Snowflake className="h-3 w-3 text-cyan-600" />
              <span>+ یخچالی (Reefer)</span>
            </button>

            <button
              type="button"
              onClick={() => handleAppendFragment("کانتینر معمولی")}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-1 text-xs font-[vazirmatn] font-bold hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-1"
            >
              <Box className="h-3 w-3 text-slate-600" />
              <span>+ معمولی (Dry)</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS: STATION TABS + SEARCH + CONTAINER TYPE */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2" dir="rtl">
          {/* Station Pills */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedGroup("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-[vazirmatn] font-bold transition-all cursor-pointer ${
                selectedGroup === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200/90 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              همه مرزها ({ROUTE_GROUPS.length})
            </button>
            {ROUTE_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedGroup(g.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-[vazirmatn] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedGroup === g.id
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200/90 dark:border-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span>{g.label}</span>
                <span className="text-[10px] opacity-70 font-mono">({g.options.length})</span>
              </button>
            ))}
          </div>

          {/* Quick Search Box */}
          <div className="relative flex items-center min-w-[180px] max-w-[220px]">
            <Search className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در مسیرها…"
              dir="rtl"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pr-8 pl-6 py-1 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 font-[vazirmatn]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Container Type Filter Bar */}
        <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold" dir="rtl">
          <span className="text-slate-500 font-[vazirmatn] ml-1">فیلتر نوع کانتینر:</span>
          <button
            type="button"
            onClick={() => setContainerFilter("all")}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              containerFilter === "all"
                ? "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            همه
          </button>
          <button
            type="button"
            onClick={() => setContainerFilter("full_reefer")}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              containerFilter === "full_reefer"
                ? "bg-sky-600 text-white shadow-2xs"
                : "bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 hover:bg-sky-100"
            }`}
          >
            <Snowflake className="h-3 w-3" />
            <span>❄️ تمام مسیر یخچالی (Full Reefer)</span>
          </button>
          <button
            type="button"
            onClick={() => setContainerFilter("switch_only")}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              containerFilter === "switch_only"
                ? "bg-purple-700 text-white shadow-2xs"
                : "bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 hover:bg-purple-100"
            }`}
          >
            <RefreshCw className="h-3 w-3" />
            <span>🔄 فقط سوییچ B/L</span>
          </button>
          <button
            type="button"
            onClick={() => setContainerFilter("reefer")}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              containerFilter === "reefer"
                ? "bg-cyan-600 text-white shadow-2xs"
                : "bg-cyan-50 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 hover:bg-cyan-100"
            }`}
          >
            <Snowflake className="h-3 w-3" />
            <span>یخچالی</span>
          </button>
          <button
            type="button"
            onClick={() => setContainerFilter("dry")}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              containerFilter === "dry"
                ? "bg-slate-700 text-white shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
          >
            <Box className="h-3 w-3" />
            <span>معمولی</span>
          </button>
        </div>
      </div>

      {/* Grouped Preset Route Buttons Grid */}
      <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1" dir="rtl">
        {displayedGroups.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 font-[vazirmatn] text-sm">
            مسیر منطبق با فیلتر انتخابی پیدا نشد. لطفاً فیلتر را تغییر دهید.
          </div>
        ) : (
          displayedGroups.map((group) => (
            <div key={group.id} className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-3 shadow-2xs space-y-2">
              {/* Group Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 font-[vazirmatn] text-xs font-black ${group.badgeColor}`}>
                    {group.label}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 font-sans">{group.sublabel}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono font-bold">{group.options.length} مسیر آماده</span>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.options.map((option) => {
                  const isActive = value === option.text

                  return (
                    <button
                      key={option.text}
                      type="button"
                      onClick={() => {
                        onChange(option.text)
                        toast.success(`مسیر "${option.text}" انتخاب شد`)
                      }}
                      className={`group/btn relative rounded-xl border p-2.5 font-[vazirmatn] text-xs font-bold leading-relaxed transition-all cursor-pointer text-right flex flex-col justify-between gap-1.5 ${
                        isActive
                          ? group.pillActiveColor
                          : group.pillHoverColor
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="block text-[13px] font-black">{option.text}</span>
                        </div>
                        {isActive && (
                          <span className="h-5 w-5 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      {/* Metadata Badges */}
                      <div className="flex flex-wrap items-center gap-1 text-[10px] font-sans">
                        {option.containerType === "full_reefer" && (
                          <span className={`px-1.5 py-0.5 rounded font-black flex items-center gap-0.5 ${
                            isActive ? "bg-white/25 text-white" : "bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800"
                          }`}>
                            <Snowflake className="h-2.5 w-2.5 text-cyan-500" />
                            Full Way Reefer (تمام یخچالی)
                          </span>
                        )}
                        {option.isSwitchBl && (
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            isActive ? "bg-white/25 text-white" : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                          }`}>
                            🔄 Switch B/L {option.switchLocation ? `(${option.switchLocation})` : ""}
                          </span>
                        )}
                        {option.containerType === "reefer" && (
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            isActive ? "bg-white/25 text-white" : "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300"
                          }`}>
                            ❄️ Reefer
                          </span>
                        )}
                        {option.containerType === "dry" && (
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            📦 Dry
                          </span>
                        )}
                        {option.containerType === "mixed" && (
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            isActive ? "bg-white/25 text-white" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}>
                            📦 معمولی ← ❄️ یخچالی
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

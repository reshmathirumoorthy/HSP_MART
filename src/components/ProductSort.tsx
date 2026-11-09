"use client";

import { ArrowUpDown } from "lucide-react";
import type { SortOption } from "@/data/products";
import { sortOptions } from "@/data/products";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value: SortOption;
  onChange: (value: SortOption) => void;
};

export function ProductSort({ value, onChange }: Props) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as SortOption)}>
      <SelectTrigger
        aria-label="Sort products"
        className="h-11 min-w-[12.5rem] gap-2 rounded-full border border-input bg-card px-4 text-sm font-medium text-foreground shadow-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <ArrowUpDown className="size-4 text-muted-foreground" />
        <span className="text-muted-foreground">Sort:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="end"
        className="rounded-xl border border-border bg-popover p-1 shadow-lg"
      >
        {sortOptions.map((option) => (
          <SelectItem
            key={option.key}
            value={option.key}
            className="cursor-pointer rounded-lg py-2 pr-8 pl-3 text-sm focus:bg-accent focus:text-accent-foreground"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

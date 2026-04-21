import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** Maximum items rendered in dropdown for performance (default 100). */
  maxItems?: number;
}

/**
 * Combobox with built-in search filtering. Renders only matching options
 * (capped by maxItems) to keep large lists (1000+) snappy.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  emptyText = 'Nenhum resultado',
  searchPlaceholder = 'Buscar...',
  disabled,
  className,
  maxItems = 100,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
    return base.slice(0, maxItems);
  }, [options, search, maxItems]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filtered.map(opt => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
              {options.length > filtered.length && !search && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  Mostrando {filtered.length} de {options.length}. Digite para buscar.
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

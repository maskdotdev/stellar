"use client"

import { useMemo, useState } from "react"

import { getCapabilityIcon } from "@/components/settings/models/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAIStore } from "@/lib/stores/ai-store"
import type { AIModel } from "@/lib/stores/ai-store"
import { cn } from "@/lib/utils/utils"
import { Check, ChevronsUpDown } from "lucide-react"

type Capability = AIModel["capabilities"][number]

export function ModelSwitcherInline() {
    const {
        providers,
        setActiveModel,
        setActiveProvider,
        getActiveModel,
        getAvailableModels,
    } = useAIStore()

    const activeModel = getActiveModel()
    const [open, setOpen] = useState(false)
    const [capabilityFilter, setCapabilityFilter] = useState<"all" | Capability>("all")

    const models = useMemo(() => {
        const all = getAvailableModels()
        if (capabilityFilter === "all") return all
        const cap: Capability = capabilityFilter
        return all.filter((m) => m.capabilities.includes(cap))
    }, [getAvailableModels, capabilityFilter])

    const modelsByProvider = useMemo(() => {
        const map: Record<string, AIModel[]> = {}
        for (const provider of providers.filter((p) => p.enabled)) {
            map[provider.id] = []
        }
        for (const m of models) {
            if (!map[m.providerId]) map[m.providerId] = []
            map[m.providerId].push(m)
        }
        return map
    }, [providers, models])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-full h-9 px-3">
                    <span className="truncate max-w-[180px]">
                        {activeModel ? activeModel.name : "Select model"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
                <Command>
                    <CommandInput placeholder="Search models..." className="h-9" />
                    <div className="flex items-center gap-1 px-2 py-1.5 border-b">
                        {["all", "text", "vision", "code", "reasoning"].map((cap) => (
                            <Button
                                key={cap}
                                size="sm"
                                variant={capabilityFilter === cap ? "secondary" : "ghost"}
                                className="h-7 px-2"
                                onClick={() => setCapabilityFilter(cap as "all" | Capability)}
                            >
                                {cap !== "all" && (
                                    <span className="mr-1">{getCapabilityIcon(cap === "text" ? "text" : cap, "sm")}</span>
                                )}
                                {cap[0].toUpperCase() + cap.slice(1)}
                            </Button>
                        ))}
                    </div>
                    <CommandEmpty>No models found.</CommandEmpty>
                    <CommandList>
                        {providers
                            .filter((p) => p.enabled)
                            .map((provider) => (
                                <CommandGroup key={provider.id} heading={provider.name}>
                                    {(modelsByProvider[provider.id] || []).map((model) => (
                                        <CommandItem
                                            key={model.id}
                                            value={`${provider.name} ${model.name}`}
                                            onSelect={() => {
                                                setActiveProvider(model.providerId)
                                                setActiveModel(model.id)
                                                setOpen(false)
                                            }}
                                        >
                                            <div className="flex items-center gap-2 flex-1">
                                                <span>{model.name}</span>
                                                {model.contextWindow && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {model.contextWindow.toLocaleString()} ctx
                                                    </Badge>
                                                )}
                                                {model.capabilities.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {model.capabilities.slice(0, 3).map((cap) => (
                                                            <span className="flex items-center p-0.5 rounded-sm bg-muted" key={cap as string}>{getCapabilityIcon(cap as Capability, "sm")}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <Check
                                                className={cn(
                                                    "ml-auto h-4 w-4",
                                                    activeModel?.id === model.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            ))}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export default ModelSwitcherInline



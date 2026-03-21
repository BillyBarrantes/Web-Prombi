
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { Conversation } from "../lib/types";
import { getConversations } from "../lib/api";

interface ConversationListProps {
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
}

export default function ConversationList({
    currentConversationId,
    onSelectConversation,
    onNewConversation,
}: ConversationListProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        loadConversations();
    }, [currentConversationId]); // Reload when conversation changes to update titles

    const loadConversations = async () => {
        setIsLoading(true);
        try {
            const data = await getConversations();
            setConversations(data);
        } catch (error) {
            console.error("Error loading conversations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className={`
                flex flex-col border-l border-r border-white/10 bg-[#0a0a0a] transition-all duration-300 flex-shrink-0
                ${isOpen ? "w-64" : "w-12"}
            `}
        >
            {/* Header / Toggle */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 h-16">
                {isOpen && <span className="font-semibold text-white">Historial</span>}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                >
                    {isOpen ? "◀" : "▶"}
                </button>
            </div>

            {/* Content */}
            {isOpen && (
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    <button
                        onClick={onNewConversation}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 transition-colors border border-blue-500/30"
                    >
                        <span className="text-lg">+</span>
                        <span className="text-sm font-medium">Nueva conversación</span>
                    </button>

                    <div className="mt-4 space-y-1">
                        {isLoading && conversations.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-4">Cargando...</div>
                        ) : conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => onSelectConversation(conv.id)}
                                className={`
                                    w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all group relative
                                    ${currentConversationId === conv.id
                                        ? "bg-blue-900/20 text-blue-400 border border-blue-800/30"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    }
                                `}
                            >
                                <div className="truncate pr-4 font-medium">{conv.title}</div>
                                <div className="text-xs text-gray-500 mt-0.5 font-light">
                                    {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true, locale: es })}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

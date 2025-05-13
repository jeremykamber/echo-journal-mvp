import { useState, type ReactElement } from "react"
import { motion } from 'framer-motion';
import {
    Drawer,
    DrawerContent,
    DrawerFooter,
    DrawerTrigger,
} from "@/components/ui/drawer"
import ChatPanel from "./ChatPanel"
import useJournalStore from '@/store/journalStore';
import { ChatInput } from "./ChatInput"

interface ChatDrawerProps {
    entryId?: string,
    hasStartedEditing?: boolean,
    threadId: string,
    inputValue?: string,
    setInputValue: (value: string) => void,
    onSend: () => void,
    inputPlaceholder?: string
}

export function ChatDrawer(props: ChatDrawerProps): ReactElement {
    const [isOpen, setIsOpen] = useState(false);

    // Get unread AI messages for this thread
    const unreadCount = useJournalStore((state) =>
        state.messages.filter(
            (m) => m.threadId === props.threadId && m.sender === 'ai' && !m.isRead
        ).length
    );


    // Animate only the shadow opacity for smoothness
    const pulse = unreadCount > 0;
    const shadowOpacityKeyframes = pulse ? [0, 0.7, 0] : [0, 0, 0];
    const pulseTransition = pulse
        ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
        : { duration: 0.4 };


    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>

            <DrawerTrigger asChild>
                <div className="ai-reflection-button w-full flex justify-center rounded-t-xl bg-primary/20 py-4">
                    <motion.div
                        className="ml-1 mt-0.5 h-2 w-8 rounded-full bg-primary shadow-none"
                        animate={{
                            boxShadow: shadowOpacityKeyframes.map(opacity => `0 0 24px 8px rgba(59,130,246,${opacity}), 0 0 48px 16px rgba(59,130,246,${opacity * 0.25})`),
                        }}
                        transition={pulseTransition}
                        style={{ willChange: "box-shadow" }}
                    />
                </div>
            </DrawerTrigger>



            {isOpen && (
                <DrawerContent>
                    <ChatPanel threadId={props.threadId} isVisible={isOpen} />
                    <DrawerFooter>
                        <ChatInput
                            value={props.inputValue || ""}
                            onChange={props.setInputValue}
                            onSend={props.onSend || (() => { })}
                            placeholder={props.inputPlaceholder || "Type a message..."}
                        />
                    </DrawerFooter>
                </DrawerContent>
            )}
        </Drawer>
    );
}

import * as React from "react"
import { Link, useLocation } from "react-router-dom"
import { Home, Settings, MessageSquare } from "lucide-react"
import useJournalStore from "@/store/journalStore"
import useConversationStore, { Conversation } from "@/store/conversationStore"
import AnimatedButton from "@/components/AnimatedButton"
import { useNavigate } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

// Define types for our navigation structure
interface NavItem {
  title: string;
  url?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  special?: "button";
}

interface NavGroup {
  title: string;
  items?: NavItem[];
  dynamic?: "entries" | "conversations"; // Updated to include conversations
}

// Define data structure for sidebar navigation
const data: { navMain: NavGroup[] } = {
  navMain: [
    {
      title: "Navigation",
      items: [
        {
          title: "Home",
          url: "/",
          icon: <Home className="h-4 w-4 mr-2" />,
        },
        {
          title: "Settings",
          url: "/settings",
          icon: <Settings className="h-4 w-4 mr-2" />,
        },
        {
          title: "createNewEntry",
          special: "button", // Special identifier for the button
        },
      ],
    },
    // Removed Journal Entries dynamic group
    {
      title: "Conversations",
      dynamic: "conversations", // Special identifier for dynamic conversations
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const navigate = useNavigate()
  const conversations = useConversationStore((state) => state.conversations)
  const createEntry = useJournalStore((state) => state.createEntry)

  // Function to create a new journal entry and navigate to it
  const handleCreateNewEntry = () => {
    const newEntryId = createEntry()
    navigate(`/entry/${newEntryId}`)
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="px-4 py-3 flex items-center gap-2">
          <a href="#" className="flex items-center">
            <span className="text-2xl font-serif font-medium text-primary-900 dark:text-white tracking-tight">echo</span>
            <span className="ml-1 mt-0.5 h-2 w-2 rounded-full bg-primary"></span>
          </a>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.dynamic === "conversations" ? (
                  // Render conversations dynamically
                  conversations.length === 0 ? (
                    <div className="px-4 py-2 text-muted-foreground text-sm italic">
                      No conversations yet.
                    </div>
                  ) : (
                    conversations.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
                      .map((conversation: Conversation) => (
                        <SidebarMenuItem key={conversation.id}>
                          <div className="relative group/conversation flex items-center">
                            <SidebarMenuButton
                              asChild
                              isActive={location.pathname === `/conversation/${conversation.id}`}
                              className="flex-1 min-w-0"
                            >
                              <Link
                                to={`/conversation/${conversation.id}`}
                                className="flex items-center"
                              >
                                <MessageSquare className="h-3 w-3 mr-2 opacity-70" />
                                <span className="truncate">{conversation.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </div>
                        </SidebarMenuItem>
                      ))
                  )
                ) : (
                  // Render standard navigation items
                  group.items?.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      {item.special === "button" ? (
                        // Render the new entry button
                        <div className="px-3 py-1">
                          <AnimatedButton
                            onClick={handleCreateNewEntry}
                            className="w-full text-sm py-2"
                            icon={true}
                          >
                            New Journal Entry
                          </AnimatedButton>
                        </div>
                      ) : (
                        // Render normal navigation links
                        <SidebarMenuButton
                          asChild
                          isActive={location.pathname === item.url}
                        >
                          <Link to={item.url || "#"} className="flex items-center">
                            {item.icon}
                            {item.title}
                          </Link>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

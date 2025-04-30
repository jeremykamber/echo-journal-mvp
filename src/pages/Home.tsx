import { type ReactElement, useState, useEffect } from 'react';
import useJournalStore, { JournalEntry, JournalState } from '@/store/journalStore';
import JournalEntryCard from '@/components/JournalEntryCard';
import EyebrowTextPill from '@/components/EyebrowTextPill';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusIcon, Upload } from 'lucide-react';
import PromptBar from '@/components/PromptBar';
import ImportDialog from '@/components/ImportDialog';

export default function Home(): ReactElement {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const entries: JournalEntry[] = useJournalStore((state: JournalState) => state.entries);
  const createEntry = useJournalStore((state: JournalState) => state.createEntry);
  const navigate = useNavigate();

  // Function to create a new journal entry and navigate to it
  const handleCreateNewEntry = () => {
    const newEntryId = createEntry();
    navigate(`/entry/${newEntryId}`);
  };

  // Toggle import dialog visibility
  const toggleImportDialog = () => {
    setShowImportDialog(prev => !prev);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      id="home-section"
      className="relative flex flex-col min-h-screen bg-gradient-to-b from-primary-foreground/50 to-background overflow-hidden"
    >
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-gradient-radial from-primary-foreground/5 to-transparent opacity-70"></div>
      {/* Noise texture */}
      <div className="absolute inset-0 bg-noise opacity-20 mix-blend-soft-light"></div>
      <div className="container flex flex-col items-center mx-auto relative z-10 flex-1 overflow-y-auto p-8">
        <EyebrowTextPill
          isLoaded={isLoaded}
          text={new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        />
        <h1
          className={cn(
            "text-4xl md:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-primary-900 max-w-4xl mx-auto text-center mb-18",
            "opacity-0",
            isLoaded && "opacity-100 animate-fade-in"
          )}
          style={{ animationDelay: '400ms' }}
        >
          Welcome to
          <br className="hidden md:block" />
          <span className="text-primary">Echo</span>
        </h1>

        <div className="w-full mb-8 flex flex-wrap justify-center gap-4">
          <Button
            onClick={handleCreateNewEntry}
            className={cn(
              "flex items-center gap-2 text-md py-6 px-6 shadow-md",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "opacity-0 transform translate-y-4",
              isLoaded && "opacity-100 translate-y-0 transition-all duration-500 ease-out"
            )}
            style={{ animationDelay: '600ms' }}
          >
            <PlusIcon size={20} />
            Create New Journal Entry
          </Button>

          <Button
            onClick={toggleImportDialog}
            className={cn(
              "flex items-center gap-2 text-md py-6 px-6 shadow-md",
              "bg-primary-foreground text-primary hover:bg-primary-foreground/90",
              "opacity-0 transform translate-y-4",
              isLoaded && "opacity-100 translate-y-0 transition-all duration-500 ease-out"
            )}
            variant="outline"
            style={{ animationDelay: '700ms' }}
          >
            <Upload size={20} />
            Import Journal Files
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {entries.slice(0, 3).map((entry: JournalEntry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
            />
          ))}

          {entries.length === 0 && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3 text-center text-muted-foreground p-8">
              <p>No journal entries yet. Create your first one!</p>
            </div>
          )}
        </div>
      </div>
      <div className="relative z-10 py-6 ">
        <div className={cn(
          "w-full max-w-3xl mx-auto px-4",
          "opacity-0 translate-y-4",
          isLoaded && "opacity-100 translate-y-0 transition-all duration-500 ease-out"
        )}
          style={{ animationDelay: '800ms' }}
        >
          <PromptBar placeholder="Ask Echo a question to start a conversation..." />
        </div>
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />
    </section>
  );
}

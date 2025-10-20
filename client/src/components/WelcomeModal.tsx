import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Target, 
  Upload, 
  BookOpen, 
  Users, 
  Calendar,
  Sparkles 
} from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

export function WelcomeModal({ open, onClose, onStartTour }: WelcomeModalProps) {
  const sections = [
    {
      icon: Target,
      title: "Progress",
      description: "Track your school's journey through the Inspire, Investigate, and Act stages"
    },
    {
      icon: Upload,
      title: "Evidence",
      description: "Submit photos and videos showing your plastic reduction achievements"
    },
    {
      icon: BookOpen,
      title: "Resources",
      description: "Access helpful guides, lesson plans, and educational materials"
    },
    {
      icon: Target,
      title: "Action Plan",
      description: "Create and manage your plastic reduction promises and goals"
    },
    {
      icon: Users,
      title: "Team",
      description: "Invite and manage your school's team members"
    },
    {
      icon: Calendar,
      title: "Events",
      description: "Join workshops, webinars, and community gatherings"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-welcome-onboarding">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-[#00A6A0]" />
            <DialogTitle className="text-2xl" data-testid="text-welcome-title">
              Welcome to Your Dashboard!
            </DialogTitle>
          </div>
          <DialogDescription data-testid="text-welcome-description">
            Your central hub for reducing plastic waste at your school. Here's what you can do:
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div
                key={index}
                className="flex gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                data-testid={`card-section-${index}`}
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-[#00A6A0]/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-[#00A6A0]" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-1" data-testid={`text-section-title-${index}`}>
                    {section.title}
                  </h3>
                  <p className="text-sm text-muted-foreground" data-testid={`text-section-description-${index}`}>
                    {section.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
            data-testid="button-skip-tour"
          >
            Get Started
          </Button>
          <Button
            onClick={() => {
              onClose();
              onStartTour();
            }}
            className="w-full sm:w-auto bg-[#00A6A0] hover:bg-[#00A6A0]/90"
            data-testid="button-start-tour"
          >
            Take a Quick Tour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

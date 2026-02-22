import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LinkedInPostGenerator } from './LinkedInPostGenerator';
import { JobRow } from '@/hooks/useJobs';

interface LinkedInPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobRow;
}

export function LinkedInPostDialog({ open, onOpenChange, job }: LinkedInPostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Gerar Post LinkedIn</DialogTitle>
        </DialogHeader>
        <LinkedInPostGenerator job={job} />
      </DialogContent>
    </Dialog>
  );
}

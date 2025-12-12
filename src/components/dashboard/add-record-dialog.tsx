'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';
import React from 'react';

const formSchema = z.object({
  material: z.enum(['Steel', 'Aluminum', 'Titanium', 'Cast Iron']),
  tool: z.enum(['End Mill', 'Drill Bit', 'Lathe Tool', 'Face Mill']),
  cuttingSpeed: z.coerce.number().min(1, 'Cutting speed must be positive.'),
  feedRate: z.coerce.number().min(0.01, 'Feed rate must be positive.'),
  surfaceFinish: z.coerce.number().min(0.1, 'Surface finish must be positive.'),
  toolWear: z.coerce.number().min(0, 'Tool wear cannot be negative.'),
});

type FormValues = z.infer<typeof formSchema>;

export function AddRecordDialog() {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      material: 'Steel',
      tool: 'End Mill',
      cuttingSpeed: 100,
      feedRate: 0.1,
      surfaceFinish: 1.5,
      toolWear: 0.01,
    },
  });
  const id = React.useId();

  function onSubmit(values: FormValues) {
    // In a real application, you would send this data to your API
    console.log(values);
    toast({
      title: 'Record Added',
      description: 'The new machining record has been saved.',
    });
    setOpen(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Record
        </Button>
      </DialogTrigger>
      <DialogContent id={id} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Machining Record</DialogTitle>
          <DialogDescription>
            Enter the details of the machining process.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="material"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a material" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Steel">Steel</SelectItem>
                      <SelectItem value="Aluminum">Aluminum</SelectItem>
                      <SelectItem value="Titanium">Titanium</SelectItem>
                      <SelectItem value="Cast Iron">Cast Iron</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tool"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tool" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="End Mill">End Mill</SelectItem>
                      <SelectItem value="Drill Bit">Drill Bit</SelectItem>
                      <SelectItem value="Lathe Tool">Lathe Tool</SelectItem>
                      <SelectItem value="Face Mill">Face Mill</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="cuttingSpeed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cutting Speed (m/min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="feedRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feed Rate (mm/rev)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="surfaceFinish"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Surface Finish (Ra)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="toolWear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tool Wear (mm)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Record</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ProcessingJob {
  id: string;
  job_type: string;
  status: "pending" | "processing" | "completed" | "failed";
  source_type: "file" | "url" | "data";
  source_path?: string;
  original_filename: string;
  title?: string;
  tags: string[];
  category_id?: string;
  progress: number;
  error_message?: string;
  result_document_id?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface ProcessingJobStats {
  total_jobs: number;
  pending_jobs: number;
  processing_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  average_processing_time: number;
}

const StatusIcon = ({ status }: { status: ProcessingJob["status"] }) => {
  switch (status) {
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "processing":
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const StatusBadge = ({ status }: { status: ProcessingJob["status"] }) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    processing: "bg-blue-100 text-blue-800 border-blue-300",
    completed: "bg-green-100 text-green-800 border-green-300",
    failed: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <Badge className={colors[status]}>
      <StatusIcon status={status} />
      <span className="ml-1 capitalize">{status}</span>
    </Badge>
  );
};

const JobDetailsDialog = ({
  job,
}: {
  job: ProcessingJob;
}) => {
  return (
    <DialogContent className="w-full">
      <DialogHeader>
        <DialogTitle>Job Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium">Job ID</span>
            <p className="text-sm text-muted-foreground font-mono">{job.id}</p>
          </div>
          <div>
            <span className="text-sm font-medium">Status</span>
            <div className="mt-1">
              <StatusBadge status={job.status} />
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Filename</span>
            <p className="text-sm text-muted-foreground">
              {job.original_filename}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium">Source Type</span>
            <p className="text-sm text-muted-foreground capitalize">
              {job.source_type}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium">Progress</span>
            <div className="mt-1">
              <Progress value={job.progress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                {job.progress}%
              </p>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Created At</span>
            <p className="text-sm text-muted-foreground">
              {new Date(job.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {job.title && (
          <div>
            <span className="text-sm font-medium">Title</span>
            <p className="text-sm text-muted-foreground">{job.title}</p>
          </div>
        )}

        {job.tags.length > 0 && (
          <div>
            <span className="text-sm font-medium">Tags</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {job.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {job.error_message && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{job.error_message}</AlertDescription>
          </Alert>
        )}

        {job.result_document_id && (
          <div>
            <span className="text-sm font-medium">Result Document ID</span>
            <p className="text-sm text-muted-foreground font-mono">
              {job.result_document_id}
            </p>
          </div>
        )}
      </div>
    </DialogContent>
  );
};

export function ProcessingStatus() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [stats, setStats] = useState<ProcessingJobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const { toast } = useToast();
  const toastRef = useRef(toast);

  // Update toast ref when toast changes
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const fetchJobs = useCallback(async () => {
    try {
      const allJobs = await invoke<ProcessingJob[]>("get_processing_jobs", {
        limit: 100,
        offset: 0,
      });
      setJobs(allJobs);
    } catch (error) {
      console.error("Failed to fetch processing jobs:", error);
      toastRef.current({
        title: "Error",
        description: "Failed to fetch processing jobs",
        variant: "destructive",
      });
    }
  }, []); // Now stable with no dependencies

  const fetchStats = useCallback(async () => {
    try {
      const jobStats = await invoke<ProcessingJobStats>(
        "get_processing_job_stats"
      );
      setStats(jobStats);
    } catch (error) {
      console.error("Failed to fetch processing stats:", error);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchJobs(), fetchStats()]);
    setLoading(false);
  }, [fetchJobs, fetchStats]);

  // Memoize filtered jobs to prevent unnecessary re-renders
  const filteredJobs = useMemo(() => {
    if (!activeTab || activeTab === "all") return jobs;
    return jobs.filter((job) => job.status === activeTab);
  }, [jobs, activeTab]);

  // Memoize job counts by status
  const jobCounts = useMemo(() => {
    const counts = {
      all: jobs.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    for (const job of jobs) {
      if (job.status === "pending") counts.pending++;
      else if (job.status === "processing") counts.processing++;
      else if (job.status === "completed") counts.completed++;
      else if (job.status === "failed") counts.failed++;
    }

    return counts;
  }, [jobs]);

  const handleRetryJob = useCallback(
    async (jobId: string) => {
      try {
        await invoke("retry_processing_job", { jobId });
        toastRef.current({
          title: "Success",
          description: "Job queued for retry",
        });
        refreshData();
      } catch (error) {
        toastRef.current({
          title: "Error",
          description: "Failed to retry job",
          variant: "destructive",
        });
      }
    },
    [refreshData] // Remove toast dependency
  );

  const handleCancelJob = useCallback(
    async (jobId: string) => {
      try {
        await invoke("cancel_processing_job", { jobId });
        toastRef.current({
          title: "Success",
          description: "Job cancelled",
        });
        refreshData();
      } catch (error) {
        toastRef.current({
          title: "Error",
          description: "Failed to cancel job",
          variant: "destructive",
        });
      }
    },
    [refreshData] // Remove toast dependency
  );

  const handleDeleteJob = useCallback(
    async (jobId: string) => {
      try {
        await invoke("delete_processing_job", { jobId });
        toastRef.current({
          title: "Success",
          description: "Job deleted",
        });
        refreshData();
      } catch (error) {
        toastRef.current({
          title: "Error",
          description: "Failed to delete job",
          variant: "destructive",
        });
      }
    },
    [refreshData] // Remove toast dependency
  );

  useEffect(() => {
    refreshData();

    // Auto-refresh every 5 seconds
    const interval = setInterval(refreshData, 5000);

    return () => clearInterval(interval);
  }, [refreshData]);

  const formatDuration = useCallback((seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }, []);

  const StatsCard = ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">PDF Processing Status</h2>
        <Button onClick={refreshData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Jobs"
            value={stats.total_jobs}
            icon={FileText}
            color="text-blue-500"
          />
          <StatsCard
            title="Pending"
            value={stats.pending_jobs}
            icon={Clock}
            color="text-yellow-500"
          />
          <StatsCard
            title="Processing"
            value={stats.processing_jobs}
            icon={RefreshCw}
            color="text-blue-500"
          />
          <StatsCard
            title="Completed"
            value={stats.completed_jobs}
            icon={CheckCircle}
            color="text-green-500"
          />
          <StatsCard
            title="Failed"
            value={stats.failed_jobs}
            icon={XCircle}
            color="text-red-500"
          />
          <div className="md:col-span-2 lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Avg. Time
                    </p>
                    <p className="text-2xl font-bold">
                      {formatDuration(stats.average_processing_time)}
                    </p>
                  </div>
                  <Clock className="h-6 w-6 text-gray-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({jobCounts.all})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({jobCounts.pending})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing ({jobCounts.processing})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({jobCounts.completed})
          </TabsTrigger>
          <TabsTrigger value="failed">Failed ({jobCounts.failed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filename</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {job.original_filename}
                            </p>
                            {job.title && (
                              <p className="text-sm text-muted-foreground">
                                {job.title}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <Progress value={job.progress} className="w-full" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {job.progress}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">
                          {new Date(job.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleTimeString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <JobDetailsDialog job={job} />
                          </Dialog>

                          {job.status === "failed" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRetryJob(job.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}

                          {job.status === "processing" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelJob(job.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredJobs.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">
                    No processing jobs found
                  </p>
                  <p className="text-muted-foreground">
                    {activeTab === "all"
                      ? "No processing jobs have been created yet."
                      : `No ${activeTab} jobs found.`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

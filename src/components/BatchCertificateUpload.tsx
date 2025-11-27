import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface CertificateData {
  studentName: string;
  email: string;
  walletAddress: string;
  course: string;
  department?: string;
  cgpa?: string;
  grade?: string;
  issueDate: string;
  institutionName?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ProcessingResult {
  row: number;
  data: CertificateData;
  status: 'pending' | 'processing' | 'success' | 'failed';
  txHash?: string;
  error?: string;
}

export const BatchCertificateUpload: React.FC = () => {
  const [csvData, setCsvData] = useState<CertificateData[]>([]);
  const [validationResults, setValidationResults] = useState<Map<number, ValidationResult>>(new Map());
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredFields = ['studentName', 'email', 'walletAddress', 'course', 'issueDate'];

  const downloadTemplate = () => {
    const template = [
      ['studentName', 'email', 'walletAddress', 'course', 'department', 'cgpa', 'grade', 'issueDate', 'institutionName'],
      ['John Doe', 'john@example.com', '0x1234...5678', 'Computer Science', 'Engineering', '8.5', 'A', '2024-01-15', 'MIT'],
      ['Jane Smith', 'jane@example.com', '0xabcd...efgh', 'Data Science', 'Engineering', '9.2', 'A+', '2024-01-15', 'MIT'],
    ];

    const csv = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'certificate-template.csv';
    a.click();

    toast.success('Template downloaded!');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CertificateData[];
        
        if (data.length === 0) {
          toast.error('CSV file is empty');
          return;
        }

        if (data.length > 100) {
          toast.error('Maximum 100 certificates per batch');
          return;
        }

        setCsvData(data);
        validateData(data);
        toast.success(`Loaded ${data.length} certificates for validation`);
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`);
      },
    });
  };

  const validateData = (data: CertificateData[]) => {
    const results = new Map<number, ValidationResult>();

    data.forEach((row, index) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check required fields
      requiredFields.forEach(field => {
        if (!row[field as keyof CertificateData]) {
          errors.push(`Missing required field: ${field}`);
        }
      });

      // Validate email
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push('Invalid email format');
      }

      // Validate wallet address
      if (row.walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(row.walletAddress)) {
        errors.push('Invalid Ethereum wallet address');
      }

      // Validate date
      if (row.issueDate && isNaN(new Date(row.issueDate).getTime())) {
        errors.push('Invalid date format (use YYYY-MM-DD)');
      }

      // Check CGPA range
      if (row.cgpa) {
        const cgpa = parseFloat(row.cgpa);
        if (isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
          warnings.push('CGPA should be between 0 and 10');
        }
      }

      // Check for duplicate emails
      const duplicateEmail = data.slice(0, index).some(r => r.email === row.email);
      if (duplicateEmail) {
        warnings.push('Duplicate email detected');
      }

      results.set(index, {
        isValid: errors.length === 0,
        errors,
        warnings,
      });
    });

    setValidationResults(results);
  };

  const processBatch = async () => {
    if (csvData.length === 0) {
      toast.error('No data to process');
      return;
    }

    const invalidCount = Array.from(validationResults.values()).filter(r => !r.isValid).length;
    if (invalidCount > 0) {
      toast.error(`Cannot process: ${invalidCount} invalid rows`);
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    const results: ProcessingResult[] = csvData.map((data, index) => ({
      row: index + 1,
      data,
      status: 'pending',
    }));

    setProcessingResults(results);

    // Process each certificate
    for (let i = 0; i < csvData.length; i++) {
      results[i].status = 'processing';
      setProcessingResults([...results]);

      try {
        // Simulate blockchain transaction
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate success with random tx hash
        const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;
        
        results[i].status = 'success';
        results[i].txHash = txHash;
        
        setProgress(Math.round(((i + 1) / csvData.length) * 100));
        setProcessingResults([...results]);
      } catch (error: any) {
        results[i].status = 'failed';
        results[i].error = error.message || 'Transaction failed';
        setProcessingResults([...results]);
      }
    }

    setIsProcessing(false);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    toast.success(`Batch complete: ${successCount} success, ${failedCount} failed`);
  };

  const exportResults = () => {
    const resultsData = processingResults.map(r => ({
      Row: r.row,
      StudentName: r.data.studentName,
      Email: r.data.email,
      Status: r.status,
      TransactionHash: r.txHash || '',
      Error: r.error || '',
    }));

    const csv = Papa.unparse(resultsData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast.success('Results exported!');
  };

  const validCount = Array.from(validationResults.values()).filter(r => r.isValid).length;
  const invalidCount = validationResults.size - validCount;
  const successCount = processingResults.filter(r => r.status === 'success').length;
  const failedCount = processingResults.filter(r => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Batch Certificate Issuing</h2>
          <p className="text-muted-foreground">Upload CSV to issue multiple certificates at once</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
          <CardDescription>Maximum 100 certificates per batch</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Click to upload CSV file</p>
            <p className="text-sm text-muted-foreground">or drag and drop</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {csvData.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="w-5 h-5" />
                <span className="font-medium">{csvData.length} rows loaded</span>
              </div>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  {validCount} valid
                </span>
                <span className="text-red-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {invalidCount} invalid
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      {csvData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Validation Results</CardTitle>
                <CardDescription>Review data before processing</CardDescription>
              </div>
              <Button
                onClick={processBatch}
                disabled={invalidCount > 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process Batch'
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Row</th>
                    <th className="text-left p-2">Student Name</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Course</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row, index) => {
                    const validation = validationResults.get(index);
                    return (
                      <tr key={index} className="border-b">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2">{row.studentName}</td>
                        <td className="p-2">{row.email}</td>
                        <td className="p-2">{row.course}</td>
                        <td className="p-2">
                          {validation?.isValid ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              <XCircle className="w-3 h-3 mr-1" />
                              Invalid
                            </Badge>
                          )}
                          {validation?.warnings.length ? (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 ml-2">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {validation.warnings.length}
                            </Badge>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Batch</CardTitle>
            <CardDescription>Issuing certificates on blockchain</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progress} className="w-full" />
            <div className="text-center text-sm text-muted-foreground">
              {progress}% Complete
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {processingResults.length > 0 && !isProcessing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Processing Results</CardTitle>
                <CardDescription>
                  {successCount} successful, {failedCount} failed
                </CardDescription>
              </div>
              <Button variant="outline" onClick={exportResults}>
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Row</th>
                    <th className="text-left p-2">Student</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Transaction Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {processingResults.map((result) => (
                    <tr key={result.row} className="border-b">
                      <td className="p-2">{result.row}</td>
                      <td className="p-2">{result.data.studentName}</td>
                      <td className="p-2">
                        {result.status === 'success' && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Success
                          </Badge>
                        )}
                        {result.status === 'failed' && (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                        {result.status === 'processing' && (
                          <Badge className="bg-blue-100 text-blue-700">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Processing
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 font-mono text-xs">
                        {result.txHash ? (
                          <a
                            href={`https://amoy.polygonscan.com/tx/${result.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                          </a>
                        ) : (
                          result.error || '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchCertificateUpload;

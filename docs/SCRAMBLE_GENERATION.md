# Receipt Scanning & Data Generation Pipeline (Server-Side)

## Overview

The server-side receipt scanning pipeline receives uploaded receipt images, processes them via OCR, and returns structured expense data.

## Pipeline Stages

```
POST /receipts/upload (multipart)
       ↓
S3/Cloud Storage
       ↓
OCR Processing (Google Vision / AWS Textract / Tesseract)
       ↓
Data Extraction (amount, date, merchant, items)
       ↓
Structured response → Client confirms → Expense created
```

## Architecture

### Receipt Module

```
ReceiptsModule
├── ReceiptsController
│   ├── POST /receipts/upload        (multipart file)
│   ├── GET  /receipts/:id           (get receipt metadata)
│   └── GET  /receipts               (list receipts)
│
├── ReceiptsService
│   ├── upload(file) → url           (S3 upload)
│   ├── process(receiptId) → data    (OCR pipeline)
│   └── extractData(ocrResult) → structured
│
├── StorageProvider (interface)
│   ├── S3StorageProvider            (AWS S3)
│   └── LocalStorageProvider         (dev fallback)
│
└── OCRProvider (interface)
    ├── TesseractOCRProvider         (open-source, self-hosted)
    └── CloudOCRProvider             (Google/AWS managed)
```

### Data Flow

```typescript
async upload(file: Express.Multer.File): Promise<ReceiptUploadResponse> {
  const url = await this.storageProvider.upload(file);
  return this.receiptsRepo.create({ url, status: "PENDING" });
}

async process(receiptId: string): Promise<ExtractedData> {
  const receipt = await this.receiptsRepo.findById(receiptId);
  const ocrResult = await this.ocrProvider.extract(receipt.url);
  const data = this.extractData(ocrResult);
  await this.receiptsRepo.update(receiptId, {
    status: "PROCESSED",
    extractedData: data,
  });
  return data;
}

type ExtractedData = {
  amount: number;
  date: string;
  merchant: string;
  items: string[];
  confidence: number;
};
```

## OCR Strategy

### Primary: Cloud API (Google Vision / AWS Textract)
- 90%+ accuracy, handles handwriting
- Built-in receipt parsing
- Cost per request

### Fallback: Tesseract.js (self-hosted)
- Free, no API key needed
- ~70% accuracy, good for dev/testing

### Hybrid
```
1. Try Cloud API first
2. If confidence < 0.8, flag for manual review
3. If Cloud API unavailable, fall back to Tesseract
4. Store raw OCR text + structured extraction
```

## Security
- Receipt images encrypted at rest (S3 SSE-S3 or SSE-KMS)
- Access controlled via expiring signed URLs
- EXIF data stripped on upload
- Receipts deletable by either couple member

## Development Testing

```bash
pnpm test -- --grep "ReceiptsService"

RECEIPT_STORAGE=local pnpm start:dev

scripts/sample-receipts/
├── supermarket.jpg
├── restaurant.png
└── handwritten.jpeg
```

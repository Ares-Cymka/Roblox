export interface DeliveryJobData {
  deliveryJobId: string;
  claimId: string;
  claimCode: string;
  productName: string;
}

export interface DeliveryResult {
  success: boolean;
  message: string;
}

export interface DeliveryAdapter {
  readonly name: string;
  deliver(data: DeliveryJobData): Promise<DeliveryResult>;
}

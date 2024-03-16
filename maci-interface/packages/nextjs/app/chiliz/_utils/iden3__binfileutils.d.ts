declare module 'iden3__binfileutils' {
    export function readBinFile(
      fileName: string,
      type: string,
      protocolVersion: number
    ): Promise<{
      fd: any;
      sections: any;
    }>;
  
    // Declare other functions and types as needed
  }
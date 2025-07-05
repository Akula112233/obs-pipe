import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET() {
  try {
    // Read the JSON file
    const filePath = path.join(process.cwd(), 'src/example-logs/scenario_explanations.json');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    // Extract and transform anomalies from the detected_issues object
    const anomalies = Object.entries(data.detected_issues).map(([key, issue]: [string, any]) => {
      return {
        id: key,
        ...issue
      };
    });

    return NextResponse.json({ 
      anomalies, 
      metadata: data.metadata 
    });
  } catch (error) {
    console.error('Error reading anomaly data:', error);
    return NextResponse.json({ error: 'Failed to fetch anomaly data' }, { status: 500 });
  }
} 
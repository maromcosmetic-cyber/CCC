// Worker startup API - Starts the pg-boss worker automatically
// Note: In production, workers should run as separate processes
// This is mainly for development/testing

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

let workerProcess: any = null;

export async function POST(request: NextRequest) {
  try {
    // Check if worker is already running
    if (workerProcess && workerProcess.pid && !workerProcess.killed) {
      return NextResponse.json({
        success: true,
        message: 'Worker is already running',
        pid: workerProcess.pid,
      });
    }

    // Start worker process
    const workersDir = join(process.cwd(), 'workers');
    const isDev = process.env.NODE_ENV === 'development';

    workerProcess = spawn(
      'npm',
      ['run', isDev ? 'dev' : 'start'],
      {
        cwd: workersDir,
        stdio: 'inherit',
        shell: true,
        detached: false,
      }
    );

    workerProcess.on('error', (error: Error) => {
      console.error('Failed to start worker:', error);
    });

    workerProcess.on('exit', (code: number) => {
      console.log(`Worker process exited with code ${code}`);
      workerProcess = null;
    });

    // Give it a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({
      success: true,
      message: 'Worker started successfully',
      pid: workerProcess.pid,
      note: 'Worker will process jobs in the background. Check server logs for worker output.',
    });
  } catch (error: any) {
    console.error('Failed to start worker:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to start worker',
        note: 'Make sure you have npm installed and the workers directory exists. For production, run workers as separate processes.',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      running: workerProcess ? !workerProcess.killed : false,
      pid: workerProcess?.pid || null,
      note: 'In production, workers should run as separate processes (e.g., using PM2 or Docker).',
    });
  } catch (error: any) {
    return NextResponse.json({
      running: false,
      pid: null,
      error: error.message,
      note: 'In production, workers should run as separate processes (e.g., using PM2 or Docker).',
    });
  }
}

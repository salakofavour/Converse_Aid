#!/usr/bin/env python
"""
Email Automation Runner

This script serves as the entry point for the email automation system.
It can be run directly or scheduled via cron to periodically check for
and respond to emails.

Usage:
    python run.py [--job-id JOB_ID]
"""

import argparse
import sys
from src import main

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Email Automation System")
    
    parser.add_argument(
        "--job-id",
        type=str,
        help="Specify a job ID to process (optional)"
    )
    
    return parser.parse_args()

if __name__ == "__main__":
    # Parse command line arguments
    args = parse_arguments()
    
    # Set job_id if provided
    kwargs = {}
    if args.job_id:
        kwargs["job_id"] = args.job_id
    
    # Run the application
    result = main(**kwargs)
    
    # Always print the result for debugging
    print(f"Result: {result}")
    
    # Exit with appropriate code
    if result["status"] in ["success", "no_action"]:
        sys.exit(0)
    else:
        sys.exit(1) 
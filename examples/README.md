# Example CSV Files

This folder contains example CSV files for testing bulk upload functionality.

## Files

### `csv/dimensions.csv`
Example dimensions CSV for testing dimension bulk upload on assessment forms.

**Format:**
- Header: `Dimension Name,Dimension Code`
- Each row contains a dimension name and its code

**Usage:**
1. Go to an assessment edit page
2. Navigate to the "Dimensions" tab
3. Click "Upload CSV"
4. Select this file

### `csv/benchmarks-template.csv`
Template for benchmarks CSV uploads. This file will be generated dynamically when you click "Download Template" on the benchmarks page, but you can use this as a reference.

**Format:**
- Header: `Dimension Name,Dimension Code,Value`
- Each row contains dimension name, code, and benchmark value

**Usage:**
1. Go to Benchmarks → Select Assessment → Select Industry
2. Click "Download Template" to get a file with your assessment's dimensions
3. Fill in benchmark values
4. Click "Upload CSV"

## Notes

- All CSV files use comma-separated values
- Headers are case-insensitive but should match expected column names
- Quoted values are supported for fields containing commas
- Empty rows are automatically skipped


#!/bin/bash
# Test the Python connectivity from Node.js

echo "Testing Python connectivity from Node.js..."

# Make python-test.py executable
chmod +x python-test.py

# Run the test script
node test-python-connection.js > python-test-results.log 2>&1

# Check if the test completed
if [ $? -eq 0 ]; then
  echo "Test completed. Results saved to python-test-results.log"
  echo ""
  echo "Last 10 lines of test results:"
  echo "-----------------------------"
  tail -n 10 python-test-results.log
else
  echo "Test failed. Check python-test-results.log for details."
fi

echo ""
echo "To view full results: cat python-test-results.log"
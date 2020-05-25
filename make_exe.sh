#!/bin/bash

pyinstaller --onefile website.pyw --windowed
mv dist/website.exe .
rm -rf build
rm -rf dist
rm website.spec
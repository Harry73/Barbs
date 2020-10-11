import sys
import os

# One method to compose them all, one method to hash them
if '__main__' == __name__:
    sys.path.append(os.path.dirname(sys.path[0]))
    from src.parsing.processor import process_data_file

    process_data_file()

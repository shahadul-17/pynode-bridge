import csv
import traceback

# returns formatted exception...
def get_formatted_exception():
  formatted_exception = traceback.format_exc()

  # if formatted_exception is 'None'...
  if formatted_exception is None:
    # we shall return empty string...
    return ''

  # otheriwse, we'll return the formatted exception...
  return formatted_exception

# reads rows from CSV file as a list where each item contains a row...
def read_rows_from_csv_file(file_path: str, separator: str = ','):
  # opens a file handle for CSV file...
  file_handle = open(file_path)
  # creates a CSV file reader...
  csv_file_reader = csv.reader(file_handle, delimiter=separator)
  # creating a new list to hold CSV row contents...
  rows = []

  # reads all the rows and saves to 
  for row in csv_file_reader:
    # appending row to rows array...
    rows.append(row)

  # closing the file handle...
  file_handle.close()

  # returns the loaded CSV rows where first row contains headers...
  return rows

# reads CSV contents from file...
def read_csv_file(file_path: str, separator: str = ','):
  # loads CSV file into memory...
  rows = read_rows_from_csv_file(file_path, separator)
  # counting the number of rows...
  row_count = len(rows)

  # if no rows are found...
  if row_count == 0:
    # we shall return an empty array...
    return []

  # extracting headers from the CSV file...
  headers = rows[0]
  # counting the number of headers...
  header_count = len(headers)
  # creating an array to store CSV contents...
  csv_contents = []

  # iterates through each row starting from index 1 (as index 0 contains headers)...
  for row_index in range(1, row_count):
    # getting current row to be processed...
    current_row = rows[row_index]
    # getting the number of columns in our current row...
    current_row_column_count = len(current_row)

    # if current row contains no column...
    if current_row_column_count == 0:
      # we skip the iteration...
      continue

    # initializing a dictionary to hold row contents as JavaScript object...
    row_content = {}

    # iterates through each column of current row...
    for column_index in range(current_row_column_count):
      # if column index is less than the number of headers...
      if column_index < header_count:
        # we shall extract appropriate column name from headers...
        column_name = headers[column_index].strip()

        # if column name is empty string...
        if len(column_name) == 0:
          # we shall set a default column name suffixed by column number (column index + 1)...
          column_name = f'column_{column_index + 1}'
      else:
        # otherwise we shall set a default column name suffixed by column number (column index + 1)...
        column_name = f'column_{column_index + 1}'

      # retrieving column value from current row...
      column_value = current_row[column_index]
      # removing whitespaces from column value, we set the value
      # to row content dictionary corresponding to the column name...
      row_content[column_name] = column_value.strip()

    # appending row content to the list that contains all the CSV contents...
    csv_contents.append(row_content)

  # returns the list containing all the CSV contents...
  return csv_contents

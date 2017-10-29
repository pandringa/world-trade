import csv
import json

# Modified from https://stackoverflow.com/questions/9942594/unicodeencodeerror-ascii-codec-cant-encode-character-u-xa0-in-position-20
def UnicodeDictReader(utf8_data, **kwargs):
    csv_reader = csv.DictReader(utf8_data, **kwargs)
    for row in csv_reader:
        yield {unicode(key, 'utf-8-sig').decode('utf-8'):value for key, value in row.iteritems()}


SPECIAL_MAPPINGS = {
  "SU": "RU" # Map Soviet Union data onto Russia
}

countries = {}
country_index = {}
count = 0
parseCount = 0

files = {
  'g': 'merchandise_full.csv', # goods
  's': 'services_full.csv', # services
}

for kind in files:
  with open(files[kind]) as csvfile:
    for row in UnicodeDictReader(csvfile):
      count += 1
      if kind == 'g' and 'Indicator_Code' in row and row['Indicator_Code'].lower() != 'to': continue;
      if 'Reporter_Code' in row and 'Partner_Code' in row and len(row['Reporter_Code']) != 2 or len(row['Partner_Code']) != 2: continue;
      code = row['Reporter_Code']
      partner = row['Partner_Code']
      year = row['Year']
      flow = row['Flow_Code'].lower()
      if code in SPECIAL_MAPPINGS:
        code = SPECIAL_MAPPINGS[code]
      if partner in SPECIAL_MAPPINGS:
        partner = SPECIAL_MAPPINGS[partner]

      if code not in country_index:
        country_index[code] = row['Reporter_Description'].decode('latin-1')
      if partner not in country_index:
        country_index[partner] = row['Partner_Description'].decode('latin-1')

      if code not in countries:
        countries[code] = {}
      if year not in countries[code]:
        countries[code][year] = {}
      if partner not in countries[code][year]:
        countries[code][year][partner] = {
          'm': {},
          'x': {}
        }
      if flow in countries[code][year][partner]:
        if kind in countries[code][year][partner][flow]:
          countries[code][year][partner][flow][kind] += float(row['Value'])
        countries[code][year][partner][flow][kind] = float(row['Value'])
        parseCount += 1

print "Parsed "+str(parseCount)+"/"+str(count)+" rows from CSV."

for country in countries:
  with open('countries/'+country+'.json', 'w') as jsonfile:
    json.dump(countries[country], jsonfile)

with open('countries/index.json', 'w') as jsonfile:
  json.dump(country_index, jsonfile)
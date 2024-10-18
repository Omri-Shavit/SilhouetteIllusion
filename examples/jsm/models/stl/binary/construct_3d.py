letter_widths = {
        'A':10.3615,
        'B':9.3179,
        'C':10.4161,
        'D':10.0341,
        'E':9.236,
        'F':8.41064,
        'G':11.14598,
        'H':9.99318,
        'I':3.60164,
        'J':7.63302,
        'K':9.31787,
        'L':7.76944,
        'M':11.62347,
        'N':10.04775,
        'O':11.21419,
        'P':9.2633,
        'Q':11.28922,
        'R':10.01364,
        'S':9.71351,
        'T':9.22919,
        'U':10.01364,
        'V':10.27967,
        'W':14.0382,
        'X':10.27967,
        'Y':10.30014,
        'Z':9.27694
    }

def developGrid(word1, word2):
    word1_is_longer = word1.length >= word2.length
    shorter_word = ""
    longer_word = ""
    if (word1_is_longer):
        longer_word = word1
        shorter_word = word2
    else:
        longer_word = word2
        shorter_word = word1
    letter_priority = {
      "A": 14,
      "B": 16,
      "C": 25,
      "D": 10,
      "E": 11,
      "F": 18,
      "G": 24,
      "H": 4,
      "I": 19,
      "J": 26,
      "K": 6,
      "L": 20,
      "M": 7,
      "N": 12,
      "O": 13,
      "P": 21,
      "Q": 9,
      "R": 8,
      "S": 22,
      "T": 17,
      "U": 2,
      "V": 3,
      "W": 1,
      "X": 5,
      "Y": 15,
      "Z": 23
    }

    shorter_word_nums = []
    longer_word_nums = []

    for i in range(len(longer_word)):
        longer_word_nums[i] = 1

    for i in range(len(shorter_word)):
        shorter_word_nums[i] = 1

    shorter_word_num_total = len(shorter_word)

    while (shorter_word_num_total < longer_word.length):
        best_letter = 0
        lowest_priority = 100
        lowest_num = 100

        for i in range(len(shorter_word)):
            if shorter_word_nums[i] < lowest_num:
                best_letter = i
                lowest_priority = letter_priority[shorter_word.charAt(i)]
                lowest_num = shorter_word_nums[i]
            else if (shorter_word_nums[i] == lowest_num & & letter_priority[shorter_word.charAt(i)] <= lowest_priority) {
            best_letter = i
            lowest_priority = letter_priority[shorter_word.charAt(i)]
            lowest_num = shorter_word_nums[i]
            }
        }
        shorter_word_nums[best_letter] = shorter_word_nums[best_letter] + 1
        shorter_word_num_total = shorter_word_num_total + 1

    let
    longer_word_array = []
    let
    shorter_word_array = []
    let
    shorter_word_letter_complete = []
    let
    longer_word_new_letter = []

    for (let i=0; i < longer_word.length; i=i+1) {
        longer_word_array.push(longer_word.charAt(i));
    longer_word_new_letter[i] = true;
    }

    for (let i=0; i < shorter_word.length; i=i+1) {
    if (shorter_word_nums[i] == 1) {
    shorter_word_array.push(shorter_word.charAt(i))
    shorter_word_letter_complete.push(true)
    }
    else {
    for (let j=0; j < shorter_word_nums[i]; j=j+1) {
    shorter_word_letter_complete.push(j == shorter_word_nums[i]-1)
    if (j < Math.floor(shorter_word_nums[i] / 2)) {
    shorter_word_array.push(shorter_word.charAt(i)+"l")
    }
    else {
    shorter_word_array.push(shorter_word.charAt(i)+"r")
    }
    }
    }
    }

    // let
    longer_word_array = []
    // let
    shorter_word_array = []
    // let
    shorter_remaining = shorter_word.length
    // let
    longer_remaining = longer_word.length

    if (word1_is_longer) {
    // console.log(longer_word_array, shorter_word_array)
    return [longer_word_array, shorter_word_array, longer_word_new_letter, shorter_word_letter_complete]
    }
    else {
    // console.log(shorter_word_array, longer_word_array)
    return [shorter_word_array, longer_word_array, shorter_word_letter_complete, longer_word_new_letter]
    }

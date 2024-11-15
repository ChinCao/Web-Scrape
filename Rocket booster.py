import concurrent.futures
import subprocess
import time
import psutil
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
import random
import os

chrome_options = ChromeOptions()

locations = [
    'Mountain', 'Piedmont', 'Dallas', 'Ammo', 'BBQ', 'Ranch', 'Trinity', 'Denver', 'Barley',
    'Kansas City', 'Glinda', 'Boston', 'Harvard', 'MIT', 'Buffalo', 'Bill', 'Charlotte', 'Earnhardt',
    'Chicago', 'Cub', 'The L', 'Wrigley', 'Cleveland', 'Brown', 'Detroit', 'Coney Dog', 'Miami',
    'Florida Man', 'Snow', 'Vice', 'New Jersey', 'Situation', 'New York', 'Empire', 'Grand Central',
    'Insomnia', 'Orlando', 'Tofu Driver', 'Philadelphia', 'Fresh Prince', 'Sunny', 'South Bend',
    'Hawkins', 'Tampa', 'Cuban Sandwich', 'Washington DC', 'Precedent', 'Bend', 'Oregon Trail',
    'Las Vegas', 'Casino', 'Los Angeles', 'Cube', 'Dogg', 'Eazy', 'Lamar', 'Pac', 'Phoenix', 'Floatie',
    'San Francisco', 'Sanitation', 'San Jose', 'Santana', 'Santa Clara', 'Seattle', 'Cobain', 'Cornell',
    'Hendrix', 'Radiohall', 'Halifax', 'Crosby', 'Montreal', 'Bagel Poutine', 'Expo 67', 'Toronto',
    'Comfort Zone', 'The 6', 'Vancouver', 'Granville', 'Stanley', 'Vansterdam', 'Mansbridge', 'Vienna',
    'Boltzmann', 'Hofburg', 'Brussels', 'Guildhouse', 'Sofia', 'Nevski', 'Zagreb', 'Tkalciceva', 'Nicosia',
    'Blue Lagoon', 'Prague', 'Staromak', 'Vltava', 'LEGO', 'Tallinn', 'Lennujaam', 'Helsinki', 'Tram',
    'Marseille', 'La Marseillaise', 'Jardin', 'Seine', 'Frankfurt', 'Castle', 'Wurstchen', 'Athens',
    'Agora', 'Odeon', 'Budapest', 'Danube', 'Reykjavik', 'Fuzzy Pony', 'Reyka', 'Dublin', 'Dullahan',
    'Grafton', 'Guinness', 'Ashdod', 'Yam Park', 'Milan', 'Duomo', 'Galleria', 'Rome', 'Colosseum',
    'Riga', 'Daugava', 'Saeima', 'Vilnius', 'Neris', 'Luxembourg', 'Chemin', 'Chisinau', 'Dendrarium',
    'Amsterdam', 'Bicycle', 'Canal', 'Red Light', 'Tulip', 'Skopje', 'Vardar', 'Oslo', 'Fjord', 'Gdansk',
    'Motlawa', 'Curie', 'Vistula', 'Lisbon', 'Bairro', 'Bucharest', 'No Vampires', 'Bratislava', 'Devin Castle',
    'Barcelona', 'Batllo', 'Madrid', 'Prado', 'Stockholm', 'Djurgarden', 'Ikea', 'Syndrome', 'Zurich', 'Alphorn',
    'Altstadt', 'Lindenhof', 'Edinburgh', 'Keeper Willie', 'London', 'Biscuits', 'Crumpets', 'Custard', 'Manchester',
    'United', 'The Tube', 'Tirana', 'Besa', 'Novi Travnik', 'Pisanica', 'Sarajevo', 'Burek', 'Tbilisi', 'Ghvino',
    'Accra', 'Best Jollof', 'Mumbai', 'Mahim', 'Nairobi', 'Sigiria', 'Moscow', 'Goodbye Lenin', 'Saint Petersburg',
    'Hermitage', 'Shnur', 'Belgrade', 'Rakia', 'Johannesburg', 'District', 'Lindfield', 'Springbok', 'Istanbul',
    'Galata', 'Lygos', 'Kyiv', 'Ghost', 'Adelaide', 'Lofty', 'Oval', 'Brisbane', 'Bad Koala', 'Good Koala',
    'Melbourne', 'Port Phillip', 'Yarra', 'Perth', 'Herdsman', 'Sydney', 'Opera House', 'Squidney', 'Auckland',
    'Hauraki', 'Parnell', 'Phnom Penh', 'Botum Pagoda', 'Hong Kong', 'Phooey', 'Victoria', 'Jakarta', 'Ancol',
    'Old Town', 'Shinkansen', 'Wabi-sabi', 'Kuala Lumpur', 'Perdana', 'Manila', 'Pasig', 'Garden', 'Marina Bay',
    'SMRT', 'Han River', 'Hangang', 'Taipei', 'Datong', 'Hangover', 'Lumphini', 'Dubai', 'Khalifa', 'Hanoi',
    'Red River', 'Kaiju', 'Buenos Aires', 'Tango', 'Sao Paulo', 'Mercadao', 'Pinacoteca', 'Santiago', 'Cueca',
    'Bogota', 'Rololandia', 'Quito', 'Cuy', 'Guadalajara', 'Crudo', 'Mexico City', 'Cojones', 'Panama City',
    'Papers', 'Lima', 'Amaru', 'Troll', 'Station'
]

timeout = 15
driver_instances = []
node_processes = []


def check(driver, success_class, error_class):
    try:
        if driver.find_element("css selector", error_class):
            driver.quit()
            return 0
    except Exception:
        try:
            if driver.find_element("css selector", success_class):
                driver.quit()
                return 1
        except Exception:
            driver.quit()
            return 0


def windscribe(action, location):
    command = f'"C:\\Program Files\\Windscribe\\windscribe-cli.exe" {action} "{location}"'
    os.popen(command)


def CoinCatapult():
    global timeout
    global driver_instances
    driver = webdriver.Chrome(options=chrome_options)
    driver_instances.append(driver)
    try:
        driver.maximize_window()
        driver.get('https://coincatapult.com/coin/dog-dog')
        error = ".ng-tns-c12-0.ng-star-inserted.ng-trigger.ng-trigger-flyInOut.ngx-toastr.toast-error"
        success = ".ng-tns-c12-0.ng-star-inserted.ng-trigger.ng-trigger-flyInOut.ngx-toastr.toast-success"
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".btn.btn-primary-custom"))).click()
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "#toast-container")))
        return check(driver, success, error)
    except Exception:
        driver.quit()
        return 0


def FomoSpider():
    global node_processes
    try:
        process = subprocess.Popen(['node', 'C:\\Users\\lenovo\\OneDrive\\dextools\\fomospider.js'],
                                   stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        node_processes.append(process)
        process.wait()
        process.terminate()
        return 1
    except Exception:
        return 0


def CoinsGem():
    global timeout
    global driver_instances
    driver = webdriver.Chrome(options=chrome_options)
    driver_instances.append(driver)
    try:
        className = ".general-buttons_btnVote__FMIm2"
        driver.maximize_window()
        driver.get('https://coinsgem.com/token/vEerjGVUQy1AuGXtyrgj5szKrGD3rTuyo2QqhdcHZSS')
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, className)))
        driver.execute_script("document.body.style.transform = 'scale(0.30)';")
        driver.execute_script("document.body.style.transformOrigin = 'top left';")
        button = driver.find_element(By.CSS_SELECTOR,className)
        driver.execute_script("arguments[0].click();", button)
        if WebDriverWait(driver, timeout-5).until(
            EC.text_to_be_present_in_element((By.CSS_SELECTOR, className),
                                             "You can vote again in 8 hours")):
            driver.quit()
            return 1
        else:
            driver.quit()
            return 0
    except Exception:
        driver.quit()
        return 0

def Top100Token():
    global timeout
    global driver_instances
    driver = webdriver.Chrome(options=chrome_options)
    driver_instances.append(driver)
    try:
        driver.maximize_window()
        driver.get('https://top100token.com/address/vEerjGVUQy1AuGXtyrgj5szKrGD3rTuyo2QqhdcHZSS')
        button = WebDriverWait(driver, timeout).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, ".vote_multi_item.button_box_transparent.button_box_transparent_interactive")))
        random_number = random.choices([0, 1], weights=[2, 1], k=1)[0]
        button[random_number].click()
        time.sleep(6)
        driver.quit()
        return 1
    except Exception as e:
        driver.quit()
        return 0

def CNToken():
    global timeout
    global driver_instances
    driver = webdriver.Chrome(options=chrome_options)
    driver_instances.append(driver)
    try:
        driver.maximize_window()
        driver.get('https://cntoken.io/coin/41975')
        error = ".el-message.el-message--error"
        success = ".el-message.el-message--success"
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "button.el-button.vote-btn.el-button--success.is-plain"))).click()
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".el-message")))
        return check(driver, success, error)
    except Exception:
        driver.quit()
        return 0


def CoinDiscovery():
    global timeout
    global driver_instances
    driver = webdriver.Chrome(options=chrome_options)
    driver_instances.append(driver)
    try:
        driver.maximize_window()
        driver.get('https://coindiscovery.app/coin/dog')
        button = WebDriverWait(driver, timeout).until(EC.presence_of_element_located(
            (By.CSS_SELECTOR, "button.coin-voting.btn.btn-golden.bmux-vote.now")))
        for i in range(1, 14):
            button.click()
            time.sleep(1)
        driver.quit()
        return 0
    except Exception:
        driver.quit()
        return 1


def DexScreener():
    global node_processes
    try:
        process = subprocess.Popen(['node', 'c:\\Users\\lenovo\\OneDrive\\dextools\\dexscreener.js'],
                                   stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
        node_processes.append(process)
        process.wait()
        process.terminate()
        return 1
    except Exception:
        return 0


attempt = 1
rocket_counts = {
    "FomoSpider": 0,
    "CNToken": 0,
    "CoinDiscovery": 0,
    "CoinCatapult": 0,
    "DexsSreener": 0,
    "CoinsGem ": 0,
    "Top100Token" : 0
}

def kill_existing():
    try:
        for proc in psutil.process_iter():
            try:
                if 'chrome.exe' in proc.name().lower():
                    proc.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
    except Exception:
        pass

def main():
    global driver_instances
    global attempt

    for location in locations:
        print(f"Attempt {attempt}")
        windscribe("connect", location)
        driver_instances = []
        try:
            tasks = {
                "FomoSpider": FomoSpider,
                "CNToken": CNToken,
                "CoinDiscovery": CoinDiscovery,
                "CoinCatapult": CoinCatapult,
                "DexsSreener": DexScreener,
                "CoinsGem": CoinsGem,
                "Top100Token": Top100Token
            }
            with concurrent.futures.ProcessPoolExecutor() as executor:
                future_to_task = {executor.submit(task_class): task_name for task_name, task_class in tasks.items()}
                for future in concurrent.futures.as_completed(future_to_task):
                    task_name = future_to_task[future]
                    global rocket_counts
                    if future.result():
                        rocket_counts[task_name] += 1
                        print(f"{task_name.capitalize()} rockets smashed: {rocket_counts[task_name]}")
                    else:
                        print(f"{task_name.capitalize()} rockets smashed: {rocket_counts[task_name]}")
            print("\n")
        except Exception:
            kill_existing()
            for node in node_processes:
                node.terminate()
        attempt += 1


if __name__ == "__main__":
    kill_existing()
    while True:
        main()

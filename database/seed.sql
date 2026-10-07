UPDATE ideas
SET title = 'Grow vegetables in a small space',
    description = 'Learn how to grow fresh vegetables at home and sell any extra.',
    long_description = 'Find out which vegetables grow well in your area. Start with a small space you can care for. Ask people what they want to buy before you grow more. Your harvest will depend on the weather, soil, and local demand.',
    category = 'Farming',
    requirements = 'A small plot, water, seeds that grow well in your area, and time to care for the plants.',
    equipment = 'Basic garden tools, seeds or young plants, water, and clean boxes for storage.',
    target_customers = 'Nearby homes, food sellers, and small shops. Ask what they need and how they buy.',
    steps = '1. Check the weather and growing season in your area. 2. Ask people what they like to buy. 3. Choose one crop and a small plot. 4. Work out what you need before buying anything. 5. Track your time, costs, harvest, and customer feedback.',
    risks = 'Bad weather, pests, lack of water, and changes in demand can affect your crop. Avoid borrowing money or growing more until you know your costs and have buyers.',
    tips = 'Write down what you spend and what you harvest. Ask local farmers for advice.',
    updated_at = NOW()
WHERE title IN ('Grow vegetables on a small plot', 'Guhinga imboga ku buso buto');

UPDATE opportunities
SET title = 'Connect local farmers with food buyers',
    description = 'Help local farmers find buyers and deliver fresh food on time.',
    long_description = 'You can help local buyers find fresh food and help farmers plan what to grow. Talk to both sides first. Agree on the amount, price, and delivery date. Keep a clear record of each order and payment.',
    category = 'Food and trade',
    requirements = 'Good contacts with local farmers and buyers, clear records, and good communication.',
    equipment = 'A phone, a notebook or computer to track orders, clean boxes, and a way to move the food.',
    target_customers = 'Homes, food sellers, and farmers who need a reliable way to manage orders.',
    steps = '1. Talk to farmers and possible buyers. 2. Start with a few products. 3. Agree on amounts and prices early. 4. Plan how to collect and deliver the food. 5. Review your costs and customer feedback after each order.',
    profitability_notes = 'Your income and costs depend on the agreed prices, transport, food waste, and order size. Track real costs. There is no guaranteed profit.',
    risks = 'Late orders, uneven quality, delivery costs, and unsold food can cause a loss. Do not buy food before you have buyers.',
    tips = 'Take orders before buying food and agree on clear rules. Track payments to buyers and farmers.',
    updated_at = NOW()
WHERE title IN ('Coordinate local produce orders', 'Guhuza abahinzi n’abaguzi b’imboga');

UPDATE skills
SET title = 'Keep simple business records',
    description = 'Learn an easy way to track sales, costs, stock, and money you owe.',
    long_description = 'Clear records help you see where your money comes from and where it goes. Start with a notebook. Write down each sale and cost when it happens. Keep receipts when you can, and check your totals often.',
    category = 'Business and money',
    requirements = 'You do not need to know accounting. Write things down often and add the date.',
    equipment = 'A notebook and pen, or a simple record sheet on your phone or computer.',
    steps = '1. Keep separate lists for sales, costs, and money owed. 2. Add the date and reason for each entry. 3. Keep your receipts together. 4. Add up your numbers each week. 5. Compare your income and costs before making a decision.',
    tips = 'Write down each money change right away. Keep business money separate from personal money. These tips do not replace local tax or accounting advice.',
    updated_at = NOW()
WHERE title IN ('Keep simple business records', 'Kubika neza amakuru y’ubucuruzi');

INSERT INTO ideas (
    title, description, long_description, category, requirements, equipment,
    target_customers, steps, risks, tips, featured, published
)
SELECT
    'Grow vegetables in a small space',
    'Learn how to grow fresh vegetables at home and sell any extra.',
    'Find out which vegetables grow well in your area. Start with a small space you can care for. Ask people what they want to buy before you grow more. Your harvest will depend on the weather, soil, and local demand.',
    'Farming',
    'A small plot, water, seeds that grow well in your area, and time to care for the plants.',
    'Basic garden tools, seeds or young plants, water, and clean boxes for storage.',
    'Nearby homes, food sellers, and small shops. Ask what they need and how they buy.',
    '1. Check the weather and growing season in your area. 2. Ask people what they like to buy. 3. Choose one crop and a small plot. 4. Work out what you need before buying anything. 5. Track your time, costs, harvest, and customer feedback.',
    'Bad weather, pests, lack of water, and changes in demand can affect your crop. Avoid borrowing money or growing more until you know your costs and have buyers.',
    'Write down what you spend and what you harvest. Ask local farmers for advice.',
    TRUE,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM ideas WHERE title = 'Grow vegetables in a small space');

INSERT INTO opportunities (
    title, description, long_description, category, requirements, equipment,
    target_customers, steps, profitability_notes, risks, tips, featured, published
)
SELECT
    'Connect local farmers with food buyers',
    'Help local farmers find buyers and deliver fresh food on time.',
    'You can help local buyers find fresh food and help farmers plan what to grow. Talk to both sides first. Agree on the amount, price, and delivery date. Keep a clear record of each order and payment.',
    'Food and trade',
    'Good contacts with local farmers and buyers, clear records, and good communication.',
    'A phone, a notebook or computer to track orders, clean boxes, and a way to move the food.',
    'Homes, food sellers, and farmers who need a reliable way to manage orders.',
    '1. Talk to farmers and possible buyers. 2. Start with a few products. 3. Agree on amounts and prices early. 4. Plan how to collect and deliver the food. 5. Review your costs and customer feedback after each order.',
    'Your income and costs depend on the agreed prices, transport, food waste, and order size. Track real costs. There is no guaranteed profit.',
    'Late orders, uneven quality, delivery costs, and unsold food can cause a loss. Do not buy food before you have buyers.',
    'Take orders before buying food and agree on clear rules. Track payments to buyers and farmers.',
    TRUE,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM opportunities WHERE title = 'Connect local farmers with food buyers');

INSERT INTO skills (
    title, description, long_description, category, requirements, equipment,
    steps, tips, featured, published
)
SELECT
    'Keep simple business records',
    'Learn an easy way to track sales, costs, stock, and money you owe.',
    'Clear records help you see where your money comes from and where it goes. Start with a notebook. Write down each sale and cost when it happens. Keep receipts when you can, and check your totals often.',
    'Business and money',
    'You do not need to know accounting. Write things down often and add the date.',
    'A notebook and pen, or a simple record sheet on your phone or computer.',
    '1. Keep separate lists for sales, costs, and money owed. 2. Add the date and reason for each entry. 3. Keep your receipts together. 4. Add up your numbers each week. 5. Compare your income and costs before making a decision.',
    'Write down each money change right away. Keep business money separate from personal money. These tips do not replace local tax or accounting advice.',
    TRUE,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM skills WHERE title = 'Keep simple business records');

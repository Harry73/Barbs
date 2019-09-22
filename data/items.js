class Item {
	constructor(name, rarity, slot, conditions, unique, price, cantrips, notes, effects) {
		this.name = name;
		this.rarity = rarity;
		this.slot = slot;
		this.conditions = conditions;
		this.unique = unique;
		this.price = price;
		this.cantrips = cantrips;
		this.notes = notes;
		this.effects = effects;
	}
	
	make_ranged_weapon(range) {
		this.range = range;
	}
	
	make_melee_weapon(range) {
		this.range = range;
	}
}

longbow_of_stunning = new Item(
	'Longbow of Stunning', 
	'Magic', 
	'2Hand', 
	[function(player) {
		return player.skill_req('Weapons: Bows', 'F');
	}],
	'false',
	'0',
	[],
	'',
	[function(player, roll) {
		if (player.is_crit(roll)) {
			return "Stun";
		}
	}],
);
longbow_of_stunning.make_ranged_weapon('200');




var items = [
	longbow_of_stunning,
	
];
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UpgradeTooltipComponent } from '../../tooltips/upgrade-tooltip/upgrade-tooltip.component';
import { TooltipDirective } from '../../tooltips/tooltip.directive';
import { MechanicDiscount } from '../../../models/mechanic.model';
import { ItemUpgrade, ItemUpgradeView, Upgrade, UpgradeCell, UpgradeProperty, UpgradeSection, UpgradeSectionRow, UpgradeSelectedEventModel } from '../../../models/upgrades/upgrades';
import { NgClass, NgStyle } from '@angular/common';
import { Item } from '../../../models/item.model';

@Component({
    selector: 'app-item-upgrades',
    standalone: true,
    imports: [TooltipDirective, NgStyle, NgClass],
    templateUrl: './item-upgrades.component.html',
    styleUrl: './item-upgrades.component.scss'
})


export class ItemUpgradesComponent {
    @Input() public selectedDiscount: MechanicDiscount;
    @Input() public upgradeProperties: UpgradeProperty[];
    @Input() public game: string;
    @Input() public item: Item;
    @Input() public selectedItemUpgrade: ItemUpgrade;
    @Output() public upgradeSelectedEvent = new EventEmitter<UpgradeSelectedEventModel>();

    @Input() public viewModel: ItemUpgradeView;
    public upgradeTooltipComponent: any = UpgradeTooltipComponent;

    protected readonly Array = Array;

    private isInited: boolean = false;

    public ngOnInit(): void {
        this.createViewModel();
        this.isInited = true;
    }

    public ngOnChanges(): void {
        if (this.isInited) {
            this.createViewModel();
        }
    }

    public selectUpgrade(upgrade: Upgrade, upgradeSection: UpgradeSection): void {
        if (upgrade.isPreinstall) {
            return;
        }
        console.log(this.selectedItemUpgrade);
        this.upgradeSelectedEvent.emit({ upgrade: upgrade, upgradeSection: upgradeSection, item: this.item, selectedItemUpgrade: this.selectedItemUpgrade });
    }

    private createViewModel(): void {
        this.viewModel = new ItemUpgradeView();

        if (this.game == 'cop') {
            this.createCopViewModel();
        }
        else {
            this.createCsViewModel();
        }

        console.log(this.viewModel)
    }

    private createCopViewModel(): void {
        this.viewModel.itemUniqueName = this.item.uniqueName;

        this.viewModel.rows = [];

        let branches: number[] = this.selectedItemUpgrade.upgradeSections.map(x => x.branch);
        let correctBranches: number[] = this.processArray(branches, [2,3], 3);

        let column: number = 0;
        let currentRow: UpgradeSectionRow = new UpgradeSectionRow();
        let cellIndex: number = 0;

        let empty = new UpgradeCell();
        empty.isEmpty = true;

        for (let branch of correctBranches) {
            if (this.viewModel.rows[branch] == null) {
                currentRow = new UpgradeSectionRow();
                currentRow.upgradeCell = [];
                this.viewModel.rows[branch] = currentRow;

                column = 0;
            }
            else {
                column++;
            }

            let cell = new UpgradeCell();
            cell.section = this.selectedItemUpgrade.upgradeSections[cellIndex];
            currentRow.upgradeCell[column] = cell;
            cellIndex++;
        }
    }

    private createCsViewModel(): void {
        console.log(this.transformToGrid(this.selectedItemUpgrade));
    }

    private processArray(input: number[], validLengths: number[], maxRepeat: number): number[] {
        const result: number[] = [];
        const targetLength = input.length;
        let i = 0;

        while (i < targetLength) {
            let j = i;
            // 1. Рахуємо довжину поточної групи
            while (j < targetLength && input[j] === input[i]) {
                j++;
            }

            const groupLength = j - i;
            const value = input[i];

            // Перевірка: чи є поточна довжина у списку валідних
            const isCurrentValid = validLengths.includes(groupLength);

            // Перевірка на "порятунок" (якщо елемент один, а далі йде валідна група)
            let isNextGroupValid = false;
            if (groupLength === 1 && j < targetLength) {
                let nextJ = j;
                while (nextJ < targetLength && input[nextJ] === input[j]) {
                    nextJ++;
                }
                const nextGroupLength = nextJ - j;
                if (validLengths.includes(nextGroupLength)) {
                    isNextGroupValid = true;
                }
            }

            if (isCurrentValid || isNextGroupValid) {
                // Додаємо елементи як є (але не більше targetLength)
                for (let k = 0; k < groupLength && result.length < targetLength; k++) {
                    result.push(value);
                }
                i = j;
            } else {
                // ПРАВИЛО ЗАПОВНЕННЯ (заповнюємо залишок масиву)
                let fillerValue = value;
                while (result.length < targetLength) {
                    // Додаємо число до maxRepeat разів
                    for (let k = 0; k < maxRepeat && result.length < targetLength; k++) {
                        result.push(fillerValue);
                    }
                    // Переходимо до наступного числа для наступного блоку
                    fillerValue++;
                }
                break;
            }
        }

        return result;
    }

    private transformToGrid(up: ItemUpgrade): void {
        this.viewModel.itemUniqueName = this.item.uniqueName;
        this.viewModel.rows = [];

        if (up.scheme.length == 1) {
            for (let upgrade of up.upgradeSections) {
                let row: UpgradeSectionRow = new UpgradeSectionRow();
                let cell: UpgradeCell = new UpgradeCell();

                cell.section = upgrade;
                row.upgradeCell = [cell];

                this.viewModel.rows.push(row);
            }
        }
        else if (up.scheme.length > 1) {
            let lineRows: number[] = [];

            for(let row = 0; row < up.scheme[0].length; row++) {
                let firstColumnRow = up.scheme[0][row];
                let min: number = firstColumnRow.y;
                let max: number = firstColumnRow.y + 40;
                let isLine: boolean = true;

                for (let col = 1; col < up.scheme.length; col++) {
                    if (!up.scheme[col].some(point => point.y == firstColumnRow.y || !(point.y > min && point.y < max))) {
                        isLine = false;
                        break;
                    }
                }

                if (isLine) {
                    lineRows.push(row);
                }
            }

            let firstColumn = up.upgradeSections.filter(x => x.elements.some(x => x.schemeIndexX == 0));

            for (let section of firstColumn) {
                let rowModel: UpgradeSectionRow = new UpgradeSectionRow();

                let cell: UpgradeCell = new UpgradeCell();
                cell.section = section;

                rowModel.upgradeCell = [cell];
                this.viewModel.rows.push(rowModel)
            }

            let secoundColumn = up.upgradeSections.filter(x => x.elements.some(x => x.schemeIndexX == 1));
            console.log(secoundColumn)

            if (up.scheme[0].length == lineRows.length) {
                /*for (let firstColumnElement of up.scheme[0]) {
                    let rowModel: UpgradeSectionRow = new UpgradeSectionRow();
                    rowModel.upgradeCell = [];

                    for (let col = 1; col < up.scheme.length; col++) {
                        let sameRowIndex: number = up.scheme[col].findIndex(point => point.y == firstColumnElement.y)
                        let cell = new UpgradeCell();

                        if (sameRowIndex > -1) {
                            let section: UpgradeSection | undefined = up.upgradeSections.find(x => x.elements.some(x => x.schemeIndexX == col && x.schemeIndexY == sameRowIndex))

                            break;
                        }
                        else {
                            cell.isEmpty = true;
                            rowModel.upgradeCell.push(cell);
                        }
                    }

                    this.viewModel.rows.push(rowModel)
                }*/
                console.log('only lines')
            }

            console.log(up);
        }
    }
}
